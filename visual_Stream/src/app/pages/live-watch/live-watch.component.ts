import { isPlatformBrowser } from '@angular/common';
import {
  Component, DestroyRef, effect, ElementRef, inject, OnInit, PLATFORM_ID, signal, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type Hls from 'hls.js';
import { catchError, distinctUntilChanged, filter, interval, map, of, switchMap, tap } from 'rxjs';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData } from '../../core/live/live.models';
import { APP_NAME } from '../../core/routing/kino-title.strategy';

const STATUS_POLL_MS = 30_000;

/** Watch page for a live broadcast. Plays HLS with hls.js (loaded on demand) or natively on Safari. */
@Component({
  selector: 'app-live-watch',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './live-watch.component.html',
  styleUrl: './live-watch.component.scss'
})
export class LiveWatchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly liveApi = inject(LiveApiService);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');
  private hls: Hls | null = null;
  private attachedUrl: string | null = null;

  readonly stream = signal<LiveStreamData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly playbackMessage = signal('');

  constructor() {
    effect(() => {
      const element = this.player()?.nativeElement;
      const stream = this.stream();
      if (element && stream?.isLive && stream.playbackUrl !== this.attachedUrl) {
        this.attachedUrl = stream.playbackUrl;
        void this.attachSource(element, stream.playbackUrl);
      }
    });
    this.destroyRef.onDestroy(() => this.destroyPlayer());
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter((streamId): streamId is string => streamId !== null),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading.set(true);
        this.errorMessage.set('');
        this.playbackMessage.set('');
        this.destroyPlayer();
      }),
      switchMap(streamId => this.liveApi.getStream(streamId).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(stream => {
      this.isLoading.set(false);
      if (!stream) {
        this.errorMessage.set('No se encontró la transmisión o no fue posible conectar con Kino.');
        return;
      }
      this.showStream(stream);
    });

    if (this.isBrowser) {
      interval(STATUS_POLL_MS).pipe(
        map(() => this.stream()),
        filter((stream): stream is LiveStreamData => stream?.isLive === true),
        switchMap(stream => this.liveApi.getStream(stream.id).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(stream => {
        if (stream && !stream.isLive) {
          this.showStream(stream);
        }
      });
    }
  }

  onPlaybackError(): void {
    this.playbackMessage.set('No se pudo reproducir la señal. Puede que la transmisión aún no haya comenzado o ya haya terminado.');
  }

  private showStream(stream: LiveStreamData): void {
    this.stream.set(stream);
    this.title.setTitle(`${stream.isLive ? '🔴 ' : ''}${stream.title} · ${APP_NAME}`);
    if (!stream.isLive) {
      this.destroyPlayer();
    }
  }

  private async attachSource(video: HTMLVideoElement, url: string): Promise<void> {
    this.playbackMessage.set('');
    const isHls = /\.m3u8(\?|#|$)/i.test(url);
    if (!isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return;
    }

    const { default: HlsPlayer } = await import('hls.js');
    if (!HlsPlayer.isSupported()) {
      this.playbackMessage.set('Tu navegador no puede reproducir transmisiones HLS.');
      return;
    }
    this.hls?.destroy();
    this.hls = new HlsPlayer({ lowLatencyMode: true });
    this.hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        this.onPlaybackError();
      }
    });
    this.hls.loadSource(url);
    this.hls.attachMedia(video);
  }

  private destroyPlayer(): void {
    this.hls?.destroy();
    this.hls = null;
    this.attachedUrl = null;
  }
}

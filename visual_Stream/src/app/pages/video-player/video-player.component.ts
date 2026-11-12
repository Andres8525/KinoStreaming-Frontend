import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss'
})
export class VideoPlayerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly videoApi = inject(VideoApiService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly video = signal<VideoCardData | null>(null);
  readonly relatedVideos = signal<VideoCardData[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly playbackMessage = signal('');
  readonly shareMessage = signal('');
  private readonly recordedViews = new Set<string>();

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const videoId = params.get('id');
      if (videoId) {
        this.loadVideo(videoId);
      }
    });
  }

  recordView(): void {
    const currentVideo = this.video();
    if (!currentVideo || !this.auth.isAuthenticated() || this.recordedViews.has(currentVideo.id)) {
      return;
    }

    this.recordedViews.add(currentVideo.id);
    this.videoApi.recordView(currentVideo.id).subscribe({
      next: result => {
        this.video.update(video => video ? { ...video, viewCount: result.viewCount, views: formatCount(result.viewCount) } : video);
      },
      error: () => {
        this.recordedViews.delete(currentVideo.id);
        this.playbackMessage.set('No se pudo registrar esta reproducción. El video sigue disponible.');
      }
    });
  }

  shareVideo(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!navigator.clipboard) {
      this.shareMessage.set('Tu navegador no permite copiar el enlace automáticamente.');
      return;
    }

    navigator.clipboard.writeText(window.location.href).then(
      () => this.shareMessage.set('Enlace copiado.'),
      () => this.shareMessage.set('No se pudo copiar el enlace; puedes copiarlo desde la barra del navegador.')
    );
  }

  onPlaybackError(): void {
    this.playbackMessage.set('No se pudo reproducir este archivo. Comprueba que la URL sea pública y compatible con el navegador.');
  }

  private loadVideo(videoId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.playbackMessage.set('');
    this.video.set(null);

    this.videoApi.getVideo(videoId).subscribe({
      next: video => {
        this.video.set(video);
        this.isLoading.set(false);
        this.loadRelated(video.id);
      },
      error: () => {
        this.errorMessage.set('No se encontró el video o no fue posible conectar con Kino.');
        this.isLoading.set(false);
      }
    });
  }

  private loadRelated(currentVideoId: string): void {
    this.videoApi.getTrending().subscribe({
      next: videos => this.relatedVideos.set(videos.filter(video => video.id !== currentVideoId).slice(0, 6)),
      error: () => this.relatedVideos.set([])
    });
  }
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
}

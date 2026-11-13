import { isPlatformBrowser } from '@angular/common';
import {
  Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, OnInit, PLATFORM_ID, signal, viewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { CameraBroadcaster } from '../../core/live/camera-broadcaster';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData, StartLiveStreamRequest } from '../../core/live/live.models';
import { cameraErrorMessage, supportsWebRtc } from '../../core/live/webrtc';

const HTTP_URL = /^https?:\/\/\S+$/i;

/** camera: from this browser over WebRTC · hls: from OBS through an external media service. */
export type GoLiveMode = 'camera' | 'hls';

/**
 * Creator Studio "Transmitir" tab. By default the creator opens the camera and goes live from the browser;
 * Kino connects every viewer directly to this tab. Streaming from OBS with an HLS URL is still available.
 */
@Component({
  selector: 'app-go-live-panel',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './go-live-panel.component.html',
  styleUrl: './go-live-panel.component.scss'
})
export class GoLivePanelComponent implements OnInit {
  private readonly liveApi = inject(LiveApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');

  readonly categories = [
    'Charlas', 'Música', 'Cine en vivo', 'Detrás de cámaras', 'Arte', 'Videojuegos', 'Tutorial', 'Otro'
  ];
  readonly mode = signal<GoLiveMode>('camera');
  readonly currentStream = signal<LiveStreamData | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** The local camera and microphone, shown in the preview and sent to viewers. */
  readonly camera = signal<MediaStream | null>(null);
  readonly isOpeningCamera = signal(false);
  readonly cameraError = signal('');
  readonly broadcaster = signal<CameraBroadcaster | null>(null);
  readonly viewerCount = computed(() => this.broadcaster()?.viewerCount() ?? 0);
  readonly connectionProblem = computed(() => this.broadcaster()?.connectionProblem() ?? false);
  readonly webRtcSupported = supportsWebRtc();

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],
    category: ['', Validators.required],
    description: ['', Validators.maxLength(1000)],
    playbackUrl: ['', [Validators.maxLength(2048), Validators.pattern(HTTP_URL)]],
    thumbnailUrl: ['', [Validators.maxLength(2048), Validators.pattern(HTTP_URL)]]
  });

  constructor() {
    effect(() => {
      const video = this.preview()?.nativeElement;
      const camera = this.camera();
      if (video && video.srcObject !== camera) {
        video.srcObject = camera;
      }
    });
    inject(DestroyRef).onDestroy(() => this.shutdown());
  }

  ngOnInit(): void {
    this.liveApi.getMyCurrentStream().subscribe({
      next: stream => {
        this.currentStream.set(stream);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo comprobar si tienes una transmisión activa.'));
        this.isLoading.set(false);
      }
    });
  }

  /** Viewers watch directly from this tab: warn before closing it while live from the camera. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.broadcaster()) {
      event.preventDefault();
    }
  }

  setMode(mode: GoLiveMode): void {
    this.mode.set(mode);
    this.errorMessage.set('');
    if (mode === 'hls') {
      this.closeCamera();
    }
  }

  async openCamera(): Promise<boolean> {
    if (this.camera()) {
      return true;
    }
    this.cameraError.set('');
    if (!this.isBrowser || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no permite usar la cámara aquí. Usa Chrome, Edge, Firefox o Safari con HTTPS.');
      return false;
    }
    this.isOpeningCamera.set(true);
    try {
      this.camera.set(await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      }));
      return true;
    } catch (error) {
      this.cameraError.set(cameraErrorMessage(error));
      return false;
    } finally {
      this.isOpeningCamera.set(false);
    }
  }

  closeCamera(): void {
    if (this.broadcaster()) {
      return;
    }
    this.camera()?.getTracks().forEach(track => track.stop());
    this.camera.set(null);
  }

  startStream(): void {
    const mode = this.mode();
    const playbackUrl = this.form.controls.playbackUrl;
    if (mode === 'hls' && !playbackUrl.value.trim()) {
      playbackUrl.setErrors({ required: true });
    }
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const camera = this.camera();
    if (mode === 'camera' && !camera) {
      this.cameraError.set('Abre tu cámara antes de empezar a transmitir.');
      return;
    }

    const value = this.form.getRawValue();
    const request: StartLiveStreamRequest = {
      title: value.title.trim(),
      category: value.category,
      sourceType: mode === 'camera' ? 'CAMERA' : 'HLS',
      playbackUrl: mode === 'hls' ? value.playbackUrl.trim() : undefined,
      description: value.description.trim() || undefined,
      thumbnailUrl: value.thumbnailUrl.trim() || undefined
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.liveApi.startStream(request).subscribe({
      next: stream => {
        this.currentStream.set(stream);
        if (stream.sourceType === 'CAMERA' && camera) {
          this.startBroadcasting(stream.id, camera);
        }
        this.successMessage.set('¡Estás en vivo! Cualquier persona con cuenta en Kino puede verte desde el inicio.');
        this.form.reset();
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo iniciar la transmisión. Inténtalo de nuevo.'));
        this.isSubmitting.set(false);
      }
    });
  }

  /** After reloading the page during a camera broadcast: turn the camera back on and accept viewers again. */
  async resumeCamera(): Promise<void> {
    const stream = this.currentStream();
    if (stream && await this.openCamera()) {
      this.startBroadcasting(stream.id, this.camera()!);
    }
  }

  endStream(): void {
    const stream = this.currentStream();
    if (!stream || this.isSubmitting()) {
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('¿Finalizar la transmisión en vivo?')) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.liveApi.endStream(stream.id).subscribe({
      next: () => {
        this.shutdown();
        this.currentStream.set(null);
        this.successMessage.set('La transmisión finalizó. ¡Gracias por transmitir en Kino!');
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo finalizar la transmisión. Inténtalo de nuevo.'));
        this.isSubmitting.set(false);
      }
    });
  }

  hasError(control: keyof typeof this.form.controls): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  private startBroadcasting(streamId: string, camera: MediaStream): void {
    this.broadcaster()?.stop();
    const broadcaster = new CameraBroadcaster(this.liveApi, streamId, camera);
    this.broadcaster.set(broadcaster);
    broadcaster.start();
  }

  private shutdown(): void {
    this.broadcaster()?.stop();
    this.broadcaster.set(null);
    this.closeCamera();
  }
}

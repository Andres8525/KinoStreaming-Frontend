import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData, StartLiveStreamRequest } from '../../core/live/live.models';

const HTTP_URL = /^https?:\/\/\S+$/i;

/** Creator Studio "Transmitir" tab: start, follow and end the creator's live broadcast. */
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

  readonly categories = [
    'Charlas', 'Música', 'Cine en vivo', 'Detrás de cámaras', 'Arte', 'Videojuegos', 'Tutorial', 'Otro'
  ];
  readonly currentStream = signal<LiveStreamData | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],
    category: ['', Validators.required],
    description: ['', Validators.maxLength(1000)],
    playbackUrl: ['', [Validators.required, Validators.maxLength(2048), Validators.pattern(HTTP_URL)]],
    thumbnailUrl: ['', [Validators.maxLength(2048), Validators.pattern(HTTP_URL)]]
  });

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

  startStream(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: StartLiveStreamRequest = {
      title: value.title.trim(),
      category: value.category,
      playbackUrl: value.playbackUrl.trim(),
      description: value.description.trim() || undefined,
      thumbnailUrl: value.thumbnailUrl.trim() || undefined
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.liveApi.startStream(request).subscribe({
      next: stream => {
        this.currentStream.set(stream);
        this.successMessage.set('¡Estás en vivo! Tu transmisión ya aparece en el inicio de Kino.');
        this.form.reset();
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo iniciar la transmisión. Inténtalo de nuevo.'));
        this.isSubmitting.set(false);
      }
    });
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
}

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api/api-error';
import { VideoApiService } from '../../core/videos/video-api.service';
import { CreateVideoRequest, CreatorAnalyticsResponse, VideoCardData } from '../../core/videos/video.models';

@Component({
  selector: 'app-creator-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './creator-studio.component.html',
  styleUrl: './creator-studio.component.scss'
})
export class CreatorStudioComponent implements OnInit {
  private readonly videoApi = inject(VideoApiService);

  readonly activeTab = signal<'upload' | 'monetization' | 'analytics'>('upload');
  readonly videoTitle = signal('');
  readonly videoDescription = signal('');
  readonly videoUrl = signal('');
  readonly thumbnailUrl = signal('');
  readonly selectedCategory = signal('');
  readonly tags = signal<string[]>(['Indie']);
  readonly newTag = signal('');
  readonly accessPrice = signal('0');
  readonly suggestedDonation = signal('');
  readonly isPublishing = signal(false);
  readonly isLoading = signal(true);
  readonly formError = signal('');
  readonly formMessage = signal('');
  readonly pageError = signal('');
  readonly videos = signal<VideoCardData[]>([]);
  readonly analytics = signal<CreatorAnalyticsResponse>({
    videoCount: 0,
    totalViews: 0,
    topVideos: []
  });

  readonly categories = [
    'Cortometraje', 'Documental', 'Animación', 'Música',
    'Videoclip', 'Experimental', 'Tutorial', 'Otro'
  ];

  ngOnInit(): void {
    this.loadVideos();
    this.loadAnalytics();
  }

  setTab(tab: 'upload' | 'monetization' | 'analytics'): void {
    this.activeTab.set(tab);
  }

  addTag(): void {
    const tag = this.newTag().trim();
    if (tag && !this.tags().some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      this.tags.update(tags => [...tags, tag]);
      this.newTag.set('');
    }
  }

  removeTag(tag: string): void {
    this.tags.update(tags => tags.filter(existing => existing !== tag));
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  readText(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  publishVideo(): void {
    if (this.isPublishing()) {
      return;
    }

    this.formError.set('');
    this.formMessage.set('');
    const title = this.videoTitle().trim();
    const description = this.videoDescription().trim();
    const videoUrl = this.videoUrl().trim();
    const thumbnailUrl = this.thumbnailUrl().trim();
    const price = Number(this.accessPrice());
    const donation = this.suggestedDonation().trim()
      ? Number(this.suggestedDonation())
      : null;
    const tags = [this.selectedCategory(), ...this.tags()]
      .map(tag => tag.trim())
      .filter((tag, index, allTags) =>
        tag && allTags.findIndex(candidate => normalizeTag(candidate) === normalizeTag(tag)) === index
      );

    if (!title || !description || !this.selectedCategory() || !isHttpUrl(videoUrl)) {
      this.formError.set('Completa título, descripción, categoría y una URL de video HTTP o HTTPS válida.');
      return;
    }
    if (tags.length > 20 || tags.some(tag => tag.length > 40)) {
      this.formError.set('Usa como máximo 20 etiquetas de hasta 40 caracteres cada una.');
      return;
    }
    if (thumbnailUrl && !isHttpUrl(thumbnailUrl)) {
      this.formError.set('La miniatura debe tener una URL HTTP o HTTPS válida.');
      return;
    }
    if (!Number.isFinite(price) || price < 0 || (donation !== null && (!Number.isFinite(donation) || donation < 0))) {
      this.formError.set('Los precios deben ser números iguales o mayores que cero.');
      return;
    }

    const request: CreateVideoRequest = {
      title,
      description,
      videoUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      tags,
      accessPrice: price,
      suggestedDonation: donation
    };

    this.isPublishing.set(true);
    this.videoApi.publishVideo(request).subscribe({
      next: video => {
        this.formMessage.set(`“${video.title}” se publicó correctamente.`);
        this.videoTitle.set('');
        this.videoDescription.set('');
        this.videoUrl.set('');
        this.thumbnailUrl.set('');
        this.selectedCategory.set('');
        this.accessPrice.set('0');
        this.suggestedDonation.set('');
        this.isPublishing.set(false);
        this.loadVideos();
        this.loadAnalytics();
      },
      error: (error: unknown) => {
        this.formError.set(apiErrorMessage(
          error,
          'No se pudo publicar el video. Revisa tu conexión y tus permisos de creador.'
        ));
        this.isPublishing.set(false);
      }
    });
  }

  private loadVideos(): void {
    this.videoApi.getCreatorVideos().subscribe({
      next: videos => {
        this.videos.set(videos);
        this.isLoading.set(false);
      },
      error: () => {
        this.pageError.set('No se pudieron cargar tus videos. Comprueba que tu cuenta tenga rol de creador.');
        this.isLoading.set(false);
      }
    });
  }

  private loadAnalytics(): void {
    this.videoApi.getCreatorAnalytics().subscribe({
      next: analytics => this.analytics.set(analytics),
      error: () => this.pageError.set('No se pudieron cargar las analíticas del canal.')
    });
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}


function normalizeTag(tag: string): string {
  return tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

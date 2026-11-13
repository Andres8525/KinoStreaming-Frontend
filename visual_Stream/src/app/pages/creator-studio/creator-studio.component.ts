import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GoLivePanelComponent } from '../../components/go-live-panel/go-live-panel.component';
import { apiErrorMessage } from '../../core/api/api-error';
import { normalizeText } from '../../core/text/normalize-text';
import { VideoApiService } from '../../core/videos/video-api.service';
import { CreateVideoRequest, CreatorAnalyticsResponse, VideoCardData } from '../../core/videos/video.models';

type StudioTab = 'upload' | 'live' | 'monetization' | 'analytics';
const STUDIO_TABS: readonly StudioTab[] = ['upload', 'live', 'monetization', 'analytics'];

function isStudioTab(value: string | null): value is StudioTab {
  return STUDIO_TABS.includes(value as StudioTab);
}

@Component({
  selector: 'app-creator-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoLivePanelComponent],
  templateUrl: './creator-studio.component.html',
  styleUrl: './creator-studio.component.scss'
})
export class CreatorStudioComponent implements OnInit {
  private readonly videoApi = inject(VideoApiService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<StudioTab>('upload');
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
  readonly deletingVideoId = signal<string | null>(null);
  readonly listMessage = signal('');
  readonly listError = signal('');
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
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (isStudioTab(requestedTab)) {
      this.activeTab.set(requestedTab);
    }
    this.loadVideos();
    this.loadAnalytics();
  }

  setTab(tab: StudioTab): void {
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
        tag && allTags.findIndex(candidate => normalizeText(candidate) === normalizeText(tag)) === index
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

  deleteVideo(video: VideoCardData): void {
    if (this.deletingVideoId()) {
      return;
    }
    if (typeof window !== 'undefined'
      && !window.confirm(`¿Eliminar “${video.title}”? Se borrarán también sus reproducciones registradas.`)) {
      return;
    }

    this.deletingVideoId.set(video.id);
    this.listMessage.set('');
    this.listError.set('');
    this.videoApi.deleteVideo(video.id).subscribe({
      next: () => {
        this.videos.update(videos => videos.filter(item => item.id !== video.id));
        this.listMessage.set(`“${video.title}” se eliminó.`);
        this.deletingVideoId.set(null);
        this.loadAnalytics();
      },
      error: (error: unknown) => {
        this.listError.set(apiErrorMessage(error, 'No se pudo eliminar el video. Inténtalo de nuevo.'));
        this.deletingVideoId.set(null);
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

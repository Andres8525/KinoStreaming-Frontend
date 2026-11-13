import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AiInsightsPanelComponent } from '../../components/ai-insights-panel/ai-insights-panel.component';
import { LiveNowComponent } from '../../components/live-now/live-now.component';
import { VideoCardComponent } from '../../components/video-card/video-card.component';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { TrendingInsights } from '../../core/ai/ai-insights.models';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData } from '../../core/live/live.models';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeText } from '../../core/text/normalize-text';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, VideoCardComponent, LiveNowComponent, AiInsightsPanelComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly videoApi = inject(VideoApiService);
  private readonly liveApi = inject(LiveApiService);
  private readonly aiInsightsApi = inject(AiInsightsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private pendingLoads = 0;

  readonly categories = signal([
    'Todo', 'Cortometrajes', 'Documentales', 'Animación', 'Música',
    'Videoclips', 'Experimental', 'Tutoriales'
  ]);
  readonly activeCategory = signal('Todo');
  readonly recommendations = signal<VideoCardData[]>([]);
  readonly trending = signal<VideoCardData[]>([]);
  readonly catalog = signal<VideoCardData[]>([]);
  readonly liveStreams = signal<LiveStreamData[]>([]);
  readonly insights = signal<TrendingInsights | null>(null);
  readonly searchTerm = signal('');
  readonly isLoading = signal(true);
  readonly errors = signal<string[]>([]);
  readonly notice = signal('');
  readonly isCreator = signal(false);

  readonly recommendedVideos = computed(() => this.filterVideos(this.recommendations()));
  readonly trendingVideos = computed(() => this.filterVideos(this.trending()));
  readonly searchResults = computed(() => {
    const query = normalizeText(this.searchTerm());
    return this.filterVideos(this.catalog()).filter(video =>
      normalizeText(`${video.title} ${video.creator} ${video.tags.join(' ')}`).includes(query)
    );
  });
  readonly featuredVideo = computed(
    () => this.trendingVideos()[0] ?? this.recommendedVideos()[0] ?? null
  );

  ngOnInit(): void {
    this.isCreator.set(this.authService.isCreator());
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.searchTerm.set(params.get('q')?.trim() ?? '');
        this.notice.set(params.get('notice') === 'creator-only'
          ? 'Creator Studio está disponible solo para cuentas de creador.'
          : '');
      });
    this.loadContent();
  }

  reload(): void {
    this.loadContent();
  }

  private loadContent(): void {
    this.pendingLoads = 0;
    this.errors.set([]);
    this.isLoading.set(true);
    this.load(this.videoApi.getRecommendations(), this.recommendations,
      'No se pudieron cargar las recomendaciones personalizadas.');
    this.load(this.videoApi.getTrending(), this.trending,
      'No se pudo cargar la lista de tendencias.');
    this.load(this.videoApi.getCatalog(), this.catalog,
      'No se pudo cargar el catálogo de videos.');
    this.load(this.liveApi.getLiveNow(), this.liveStreams,
      'No se pudieron cargar las transmisiones en vivo.');
    this.load<TrendingInsights | null>(this.aiInsightsApi.getTrendingInsights(), this.insights,
      'No se pudo cargar el análisis de Kino IA.');
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  scrollCarousel(direction: 'left' | 'right', carouselId: string): void {
    const container = document.getElementById(carouselId);
    if (container) {
      container.scrollBy({
        left: direction === 'right' ? 320 : -320,
        behavior: 'smooth'
      });
    }
  }

  private load<T>(
    request: Observable<T>,
    target: WritableSignal<T>,
    errorMessage: string
  ): void {
    this.pendingLoads++;
    let settled = false;
    const finish = (): void => {
      if (!settled) {
        settled = true;
        this.pendingLoads--;
        this.isLoading.set(this.pendingLoads > 0);
      }
    };

    request.subscribe({
      next: value => target.set(value),
      error: () => {
        this.errors.update(errors => [...errors, errorMessage]);
        finish();
      },
      complete: finish
    });
  }

  private filterVideos(videos: VideoCardData[]): VideoCardData[] {
    const aliases: Record<string, string[]> = {
      Cortometrajes: ['cortometraje', 'cortometrajes'],
      Documentales: ['documental', 'documentales'],
      Animación: ['animación', 'animacion'],
      Música: ['música', 'musica'],
      Videoclips: ['videoclip', 'videoclips'],
      Experimental: ['experimental'],
      Tutoriales: ['tutorial', 'tutoriales']
    };
    const category = this.activeCategory();
    if (category === 'Todo') {
      return videos;
    }

    const acceptedTags = aliases[category] ?? [category.toLowerCase()];
    return videos.filter(video =>
      video.tags.some(tag =>
        acceptedTags.some(acceptedTag => normalizeText(acceptedTag) === normalizeText(tag))
      )
    );
  }
}

import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-error';
import { AiRecommendations, TrendingInsights } from '../../core/ai/ai-insights.models';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { VIDEO_CATEGORIES } from '../../core/videos/video-categories';
import { VideoCardData } from '../../core/videos/video.models';
import {
  PersonalCard,
  RankedCard,
  RecommendationEngineService
} from '../../core/workers/recommendation-engine.service';
import { WatchHistoryService } from '../../core/workers/watch-history.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';

export type AiPanelTab = 'summary' | 'most-watched' | 'recommendations' | 'chat';

export const ALL_RECOMMENDATIONS = 'Todos';

export const AI_PANEL_TABS: readonly { id: AiPanelTab; label: string }[] = [
  { id: 'summary', label: 'Resumen' },
  { id: 'most-watched', label: 'Ver lo más visto' },
  { id: 'recommendations', label: 'Recomendaciones IA' },
  { id: 'chat', label: 'Chatear con Kino IA' }
];

@Component({
  selector: 'app-ai-insights-panel',
  standalone: true,
  imports: [DecimalPipe, RouterLink, AiChatComponent],
  templateUrl: './ai-insights-panel.component.html',
  styleUrl: './ai-insights-panel.component.scss'
})
export class AiInsightsPanelComponent {
  private readonly api = inject(AiInsightsService);
  private readonly engine = inject(RecommendationEngineService);
  private readonly watchHistory = inject(WatchHistoryService);
  private recommendationsRequest: Subscription | null = null;
  private analysisRequest: Subscription | null = null;
  private rankingRun = 0;

  readonly insights = input.required<TrendingInsights>();
  readonly catalog = input<VideoCardData[]>([]);
  readonly realtime = input(false);

  readonly tabs = AI_PANEL_TABS;
  readonly categories = [ALL_RECOMMENDATIONS, ...VIDEO_CATEGORIES.map(category => category.name)];
  readonly skeletons = [0, 1, 2];
  readonly activeTab = signal<AiPanelTab>('summary');
  readonly ranking = signal<RankedCard[]>([]);
  readonly rankingReady = signal(false);
  readonly recommendationCategory = signal(ALL_RECOMMENDATIONS);
  readonly recommendations = signal<AiRecommendations | null>(null);
  readonly loadingRecommendations = signal(false);
  readonly recommendationsError = signal('');
  readonly personalPicks = signal<PersonalCard[]>([]);
  readonly hasHistory = signal(false);
  readonly runsInWorker = this.engine.runsInWorker;
  readonly current = linkedSignal(() => this.insights());
  readonly generating = signal(false);
  readonly analysisMessage = signal('');
  readonly analysisFailed = signal(false);

  readonly sourceLabel = computed(() =>
    this.current().source === 'ai' ? 'Generado con Gemini IA' : 'Análisis automático de Kino');
  readonly maxCategoryViews = computed(() =>
    Math.max(1, ...this.current().topCategories.map(category => category.totalViews)));
  private readonly rankingSource = computed(() => {
    const catalog = this.catalog();
    return catalog.length ? catalog : this.current().mostWatched;
  });

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const videos = this.rankingSource();
      if (tab === 'most-watched') {
        untracked(() => this.rank(videos));
      } else if (tab === 'recommendations') {
        untracked(() => this.personalize(videos));
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.recommendationsRequest?.unsubscribe();
      this.analysisRequest?.unsubscribe();
    });
  }

  generateAnalysis(): void {
    if (this.generating()) {
      return;
    }
    this.generating.set(true);
    this.analysisFailed.set(false);
    this.analysisMessage.set('Kino IA está analizando lo más visto…');
    this.analysisRequest = this.api.generateAnalysis().subscribe({
      next: insights => {
        this.current.set(insights);
        this.activeTab.set('summary');
        this.generating.set(false);
        this.analysisMessage.set(insights.source === 'ai'
          ? 'Análisis actualizado con Gemini IA.'
          : 'Análisis actualizado con las estadísticas de Kino.');
      },
      error: (error: unknown) => {
        this.generating.set(false);
        this.analysisFailed.set(true);
        this.analysisMessage.set(apiErrorMessage(error, 'No se pudo generar el análisis. Inténtalo de nuevo.'));
      }
    });
  }

  categoryWidth(views: number): number {
    return Math.max(4, Math.round((views / this.maxCategoryViews()) * 100));
  }

  selectTab(tab: AiPanelTab): void {
    this.activeTab.set(tab);
    if (tab === 'recommendations' && !this.recommendations() && !this.loadingRecommendations()) {
      this.loadRecommendations(this.recommendationCategory());
    }
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!offset) {
      return;
    }
    event.preventDefault();
    const next = this.tabs[(index + offset + this.tabs.length) % this.tabs.length];
    this.selectTab(next.id);
    const target = event.currentTarget as HTMLElement | null;
    target?.parentElement?.querySelector<HTMLElement>(`#ai-tab-${next.id}`)?.focus();
  }

  loadRecommendations(category: string): void {
    this.recommendationCategory.set(category);
    this.loadingRecommendations.set(true);
    this.recommendationsError.set('');
    this.recommendationsRequest?.unsubscribe();
    const alias = VIDEO_CATEGORIES.find(item => item.name === category)?.aliases[0] ?? category;
    this.recommendationsRequest = this.api
      .getRecommendations(category === ALL_RECOMMENDATIONS ? undefined : alias)
      .subscribe({
        next: recommendations => {
          this.recommendations.set(recommendations);
          this.loadingRecommendations.set(false);
        },
        error: (error: unknown) => {
          this.recommendationsError.set(apiErrorMessage(error, 'No se pudieron cargar las recomendaciones de Kino IA.'));
          this.loadingRecommendations.set(false);
        }
      });
  }

  private rank(videos: VideoCardData[]): void {
    const run = ++this.rankingRun;
    void this.engine.rankMostWatched(videos, 10).then(ranking => {
      if (run === this.rankingRun) {
        this.ranking.set(ranking);
        this.rankingReady.set(true);
      }
    });
  }

  private personalize(videos: VideoCardData[]): void {
    const history = this.watchHistory.entries();
    this.hasHistory.set(history.length > 0);
    void this.engine.personalize(videos, history, 6).then(picks => this.personalPicks.set(picks));
  }
}

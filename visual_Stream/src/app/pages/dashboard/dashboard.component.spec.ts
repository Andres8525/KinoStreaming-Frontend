import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { TrendingInsights } from '../../core/ai/ai-insights.models';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData } from '../../core/live/live.models';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const musicVideo = createVideo('music', 'Música en vivo', ['Música']);
  const decomposedAnimationVideo = createVideo('animation', 'Animación', ['Animacio\u0301n']);
  let videoApi: {
    getCatalog: ReturnType<typeof vi.fn>;
    getTrending: ReturnType<typeof vi.fn>;
    getRecommendations: ReturnType<typeof vi.fn>;
  };
  let queryParams: Subject<ParamMap>;
  let liveApi: { getLiveNow: ReturnType<typeof vi.fn> };
  let aiInsights: { getTrendingInsights: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    queryParams = new Subject<ParamMap>();
    videoApi = {
      getCatalog: vi.fn(() => of([musicVideo, decomposedAnimationVideo])),
      getTrending: vi.fn(() => of([musicVideo, decomposedAnimationVideo])),
      getRecommendations: vi.fn(() => of([musicVideo, decomposedAnimationVideo]))
    };
    liveApi = { getLiveNow: vi.fn(() => of([] as LiveStreamData[])) };
    aiInsights = { getTrendingInsights: vi.fn(() => of(createInsights())) };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParams.asObservable() }
        },
        {
          provide: VideoApiService,
          useValue: videoApi
        },
        { provide: LiveApiService, useValue: liveApi },
        { provide: AiInsightsService, useValue: aiInsights }
      ]
    }).compileComponents();
  });

  it('matches search queries regardless of diacritics', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.searchTerm.set('musica');

    expect(fixture.componentInstance.searchResults().map(video => video.id)).toEqual(['music']);
  });

  it('matches decomposed accented tags when filtering categories', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.setCategory('Animación');

    expect(fixture.componentInstance.recommendedVideos().map(video => video.id)).toEqual(['animation']);
  });

  it('retries content requests after a failure', () => {
    videoApi.getCatalog
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of([musicVideo, decomposedAnimationVideo]));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errors()).toHaveLength(1);
    const retryButton = fixture.nativeElement.querySelector('.dashboard-retry') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(videoApi.getCatalog).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.errors()).toEqual([]);
    expect(fixture.componentInstance.catalog()).toHaveLength(2);
  });

  it('stops reacting to route search changes after destruction', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    fixture.destroy();
    queryParams.next(convertToParamMap({ q: 'ignored' }));

    expect(component.searchTerm()).toBe('');
  });

  it('invites every account to publish videos and go live', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.cta-card a')] as HTMLAnchorElement[];

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/creator-studio', '/creator-studio?tab=live']);
    expect(fixture.nativeElement.querySelector('.cta-card').textContent).toContain('Transmitir en vivo');
  });

  it('describes the selected category and lists its videos', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.setCategory('Música');
    fixture.detectChanges();
    const showcase = fixture.nativeElement.querySelector('.category-showcase') as HTMLElement;

    expect(showcase.textContent).toContain('Aquí podrás encontrar conciertos');
    expect(showcase.querySelector('.category-grid app-video-card')).not.toBeNull();
    expect(fixture.componentInstance.categoryVideos().map(video => video.id)).toEqual(['music']);
  });

  it('invites creators to publish the first video of an empty category', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.setCategory('Documentales');
    fixture.detectChanges();
    const showcase = fixture.nativeElement.querySelector('.category-showcase') as HTMLElement;

    expect(showcase.textContent).toContain('Aquí podrás encontrar documentales');
    expect(showcase.textContent).toContain('Todavía no hay videos en Documentales');
    expect(showcase.querySelector('a[href="/creator-studio"]')).not.toBeNull();
  });

  it('offers to publish or go live when there are no videos yet', () => {
    videoApi.getCatalog.mockReturnValue(of([]));
    videoApi.getTrending.mockReturnValue(of([]));
    videoApi.getRecommendations.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.hero-empty-actions a')] as HTMLAnchorElement[];

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/creator-studio', '/creator-studio?tab=live']);
  });

  it('shows no category section for "Todo"', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.category-showcase')).toBeNull();
  });

  it('shows a notice after a creator-only redirect', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    queryParams.next(convertToParamMap({ notice: 'creator-only' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dashboard-notice')?.textContent).toContain('solo para cuentas de creador');
  });

  it('shows the Kino IA panel with the most watched ranking', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('app-ai-insights-panel') as HTMLElement;

    expect(panel.textContent).toContain('Kino IA');
    expect(panel.textContent).toContain('Lo más visto en Kino ahora es «Música en vivo»');
    expect(panel.textContent).toContain('Análisis automático de Kino');
    expect(panel.querySelector('.ai-ranking a[href="/watch/music"]')).not.toBeNull();
  });

  it('lists live broadcasts only when someone is streaming', () => {
    const empty = TestBed.createComponent(DashboardComponent);
    empty.detectChanges();
    expect(empty.nativeElement.querySelector('app-live-now')).toBeNull();

    liveApi.getLiveNow.mockReturnValue(of([createLiveStream()]));
    const live = TestBed.createComponent(DashboardComponent);
    live.detectChanges();
    const card = live.nativeElement.querySelector('app-live-now a.live-card') as HTMLAnchorElement;

    expect(card.getAttribute('href')).toBe('/live/stream-1');
    expect(card.textContent).toContain('EN VIVO');
    expect(card.textContent).toContain('Ensayo abierto');
  });

  it('reports a Kino IA failure without hiding the rest of the dashboard', () => {
    aiInsights.getTrendingInsights.mockReturnValue(throwError(() => new Error('down')));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errors()).toEqual(['No se pudo cargar el análisis de Kino IA.']);
    expect(fixture.componentInstance.trendingVideos().length).toBe(2);
    expect(fixture.nativeElement.querySelector('app-ai-insights-panel')).toBeNull();
  });
});

function createVideo(id: string, title: string, tags: string[]): VideoCardData {
  return {
    id,
    title,
    description: 'Una historia original.',
    videoUrl: 'https://cdn.example.com/video.mp4',
    creator: 'Ana Ruiz',
    creatorAvatar: 'AR',
    thumbnail: '',
    views: '1',
    viewCount: 1,
    duration: '',
    category: tags[0] ?? 'Sin categoría',
    timeAgo: '',
    tags,
    accessPrice: 0,
    suggestedDonation: null
  };
}

function createInsights(): TrendingInsights {
  return {
    generatedAt: '2026-11-12T12:00:00Z',
    source: 'kino-analytics',
    summary: 'Lo más visto en Kino ahora es «Música en vivo» de Ana Ruiz con 12 reproducciones.',
    mostWatched: [createVideo('music', 'Música en vivo', ['Música'])],
    rising: [],
    topCategories: [{ category: 'Música', videoCount: 1, totalViews: 12 }],
    totalViews: 12,
    liveNow: 0
  };
}

function createLiveStream(): LiveStreamData {
  return {
    id: 'stream-1',
    title: 'Ensayo abierto',
    description: '',
    category: 'Música',
    sourceType: 'HLS',
    playbackUrl: 'https://live.example.com/stream.m3u8',
    thumbnail: '',
    isLive: true,
    creator: 'Ana Ruiz',
    creatorAvatar: 'AR',
    startedAt: '2026-11-12T11:00:00Z',
    startedAgo: 'hace 1 hora',
    endedAt: null
  };
}

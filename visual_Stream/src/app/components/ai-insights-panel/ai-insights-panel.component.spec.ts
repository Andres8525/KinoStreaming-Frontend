import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AiRecommendations, TrendingInsights } from '../../core/ai/ai-insights.models';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { KinoSocketService } from '../../core/realtime/kino-socket.service';
import { VideoCardData } from '../../core/videos/video.models';
import { RECOMMENDATION_WORKER_FACTORY } from '../../core/workers/recommendation-engine.service';
import { AiInsightsPanelComponent } from './ai-insights-panel.component';

function card(id: string, category: string, viewCount: number): VideoCardData {
  return {
    id, title: `Video ${id}`, description: '', videoUrl: '', creator: 'Ana Ruiz', creatorAvatar: '', thumbnail: '',
    views: String(viewCount), viewCount, duration: '', category, timeAgo: '', tags: [category], accessPrice: 0,
    suggestedDonation: null
  };
}

const INSIGHTS: TrendingInsights = {
  generatedAt: '2026-11-15T12:00:00Z', source: 'kino-analytics', summary: 'Lo más visto en Kino ahora es Video a',
  mostWatched: [card('a', 'Animación', 300)], rising: [], topCategories: [], totalViews: 400, liveNow: 0
};

const RECOMMENDATIONS: AiRecommendations = {
  category: 'Documental', source: 'ai', summary: 'Dos joyas documentales', generatedAt: '2026-11-15T12:00:00Z',
  recommendations: [{ video: card('b', 'Documental', 100), reason: 'Lo más visto en Documental', score: 4.6 }]
};

describe('AiInsightsPanelComponent', () => {
  let getRecommendations: ReturnType<typeof vi.fn>;
  let generateAnalysis: ReturnType<typeof vi.fn>;

  async function setup(realtime = false) {
    getRecommendations = vi.fn().mockReturnValue(of(RECOMMENDATIONS));
    generateAnalysis = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AiInsightsPanelComponent],
      providers: [
        provideRouter([]),
        { provide: AiInsightsService, useValue: { getRecommendations, generateAnalysis, chat: vi.fn() } },
        { provide: KinoSocketService, useValue: { status: signal('closed'), request: vi.fn() } },
        { provide: RECOMMENDATION_WORKER_FACTORY, useValue: () => null }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(AiInsightsPanelComponent);
    fixture.componentRef.setInput('insights', INSIGHTS);
    fixture.componentRef.setInput('catalog', [card('a', 'Animación', 300), card('b', 'Documental', 100)]);
    fixture.componentRef.setInput('realtime', realtime);
    fixture.detectChanges();
    return fixture;
  }

  function tab(element: HTMLElement, label: string): HTMLButtonElement {
    const button = [...element.querySelectorAll<HTMLButtonElement>('[role=tab]')]
      .find(item => item.textContent?.trim() === label);
    if (!button) {
      throw new Error(`Tab ${label} not found`);
    }
    return button;
  }

  it('shows the summary first with buttons for the other Kino IA features', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.ai-summary')?.textContent).toContain('Lo más visto en Kino ahora es Video a');
    expect([...element.querySelectorAll('[role=tab]')].map(item => item.textContent?.trim()))
      .toEqual(['Resumen', 'Ver lo más visto', 'Recomendaciones IA', 'Chatear con Kino IA']);
    expect(tab(element, 'Resumen').getAttribute('aria-selected')).toBe('true');
  });

  it('ranks the catalog by views when choosing "Ver lo más visto"', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    tab(element, 'Ver lo más visto').click();
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('.ai-top-item')).toHaveLength(2);
    });
    const items = element.querySelectorAll('.ai-top-item');
    expect(items[0].textContent).toContain('Video a');
    expect(items[0].querySelector('.ai-share')?.textContent).toContain('75%');
  });

  it('loads AI recommendations by category using the tag the backend knows', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    tab(element, 'Recomendaciones IA').click();
    fixture.detectChanges();
    expect(getRecommendations).toHaveBeenCalledWith(undefined);

    fixture.componentInstance.loadRecommendations('Documentales');
    fixture.detectChanges();

    expect(getRecommendations).toHaveBeenLastCalledWith('documental');
    expect(element.querySelector('.ai-summary--compact')?.textContent).toContain('Dos joyas documentales');
    expect(element.querySelector('.ai-reason')?.textContent).toContain('Lo más visto en Documental');
  });

  it('explains when the recommendations cannot be loaded', async () => {
    const fixture = await setup();
    getRecommendations.mockReturnValue(throwError(() => new Error('down')));

    fixture.componentInstance.selectTab('recommendations');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent)
      .toContain('No se pudieron cargar las recomendaciones');
  });

  it('generates a fresh analysis with the "Generar análisis" button', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;
    generateAnalysis.mockReturnValue(of({ ...INSIGHTS, source: 'ai', summary: 'Nuevo análisis de Gemini' }));

    element.querySelector<HTMLButtonElement>('.ai-generate')?.click();
    fixture.detectChanges();

    expect(generateAnalysis).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.ai-summary')?.textContent).toContain('Nuevo análisis de Gemini');
    expect(element.querySelector('.ai-source')?.textContent).toContain('Generado con Gemini IA');
    expect(element.querySelector('.ai-analysis-status')?.textContent).toContain('Análisis actualizado con Gemini IA');
  });

  it('explains when the analysis cannot be generated', async () => {
    const fixture = await setup();
    generateAnalysis.mockReturnValue(throwError(() => new Error('down')));

    fixture.componentInstance.generateAnalysis();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('No se pudo generar el análisis');
    expect(fixture.componentInstance.generating()).toBe(false);
  });

  it('opens the chat from the summary shortcut', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLButtonElement>('.ai-ask')?.click();
    fixture.detectChanges();

    expect(element.querySelector('app-ai-chat')).not.toBeNull();
  });

  it('opens the chat and marks real-time updates', async () => {
    const fixture = await setup(true);
    const element: HTMLElement = fixture.nativeElement;

    tab(element, 'Chatear con Kino IA').click();
    fixture.detectChanges();

    expect(element.querySelector('app-ai-chat')).not.toBeNull();
    expect(element.querySelector('.ai-live')?.textContent).toContain('En tiempo real');
  });

  it('moves between tabs with the arrow keys', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    tab(element, 'Resumen').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('chat');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.constants';
import { AiInsightsService } from './ai-insights.service';
import { AiChatReply, AiRecommendations, TrendingInsights } from './ai-insights.models';

describe('AiInsightsService', () => {
  it('loads the trending analysis and maps videos to cards', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AiInsightsService);
    const httpTesting = TestBed.inject(HttpTestingController);
    let insights: TrendingInsights | undefined;

    service.getTrendingInsights().subscribe(result => insights = result);
    httpTesting.expectOne(`${API_BASE_URL}/ai/trending-insights`).flush({
      generatedAt: '2026-11-12T12:00:00Z',
      source: 'ai',
      summary: 'Resumen',
      mostWatched: [{
        id: 'v1', title: 'Ruta andina', description: '', videoUrl: 'https://cdn.example.com/v.mp4', thumbnailUrl: null,
        tags: ['Documental'], accessPrice: 0, suggestedDonation: null,
        creator: { id: 'c1', displayName: 'Ana Ruiz' }, viewCount: 1500, createdAt: '2026-11-10T12:00:00Z'
      }],
      rising: [],
      topCategories: [{ category: 'Documental', videoCount: 1, totalViews: 1500 }],
      totalViews: 1500,
      liveNow: 2
    });

    expect(insights?.source).toBe('ai');
    expect(insights?.mostWatched[0].creator).toBe('Ana Ruiz');
    expect(insights?.mostWatched[0].category).toBe('Documental');
    expect(insights?.liveNow).toBe(2);
    httpTesting.verify();
  });

  it('asks Kino IA and maps the suggested videos', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AiInsightsService);
    const httpTesting = TestBed.inject(HttpTestingController);
    let reply: AiChatReply | undefined;

    service.chat([{ role: 'user', content: '¿Qué veo hoy?' }]).subscribe(result => reply = result);
    const request = httpTesting.expectOne(`${API_BASE_URL}/ai/chat`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ messages: [{ role: 'user', content: '¿Qué veo hoy?' }] });
    request.flush({ reply: 'Mira Ruta andina', source: 'ai', suggestions: [VIDEO], generatedAt: '2026-11-15T12:00:00Z' });

    expect(reply?.reply).toBe('Mira Ruta andina');
    expect(reply?.suggestions[0].title).toBe('Ruta andina');
    httpTesting.verify();
  });

  it('loads the recommendations of a category', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AiInsightsService);
    const httpTesting = TestBed.inject(HttpTestingController);
    let recommendations: AiRecommendations | undefined;

    service.getRecommendations('documental').subscribe(result => recommendations = result);
    httpTesting.expectOne(`${API_BASE_URL}/ai/recommendations?category=documental`).flush({
      category: 'Documental', source: 'kino-analytics', summary: 'Empieza por Ruta andina',
      recommendations: [{ video: VIDEO, reason: 'Lo más visto en Documental', score: 7.3 }],
      generatedAt: '2026-11-15T12:00:00Z'
    });

    expect(recommendations?.category).toBe('Documental');
    expect(recommendations?.recommendations[0].video.creator).toBe('Ana Ruiz');
    expect(recommendations?.recommendations[0].reason).toBe('Lo más visto en Documental');
    httpTesting.verify();
  });
});

const VIDEO = {
  id: 'v1', title: 'Ruta andina', description: '', videoUrl: 'https://cdn.example.com/v.mp4', thumbnailUrl: null,
  tags: ['Documental'], accessPrice: 0, suggestedDonation: null,
  creator: { id: 'c1', displayName: 'Ana Ruiz' }, viewCount: 1500, createdAt: '2026-11-10T12:00:00Z'
};

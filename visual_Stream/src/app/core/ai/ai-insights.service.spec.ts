import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.constants';
import { AiInsightsService } from './ai-insights.service';
import { TrendingInsights } from './ai-insights.models';

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
});

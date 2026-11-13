import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { toVideoCardData } from '../videos/video-api.service';
import { TrendingInsights, TrendingInsightsResponse } from './ai-insights.models';

/** Client for the "Kino IA" trending analyzer. */
@Injectable({ providedIn: 'root' })
export class AiInsightsService {
  private readonly http = inject(HttpClient);

  getTrendingInsights(): Observable<TrendingInsights> {
    return this.http.get<TrendingInsightsResponse>(`${API_BASE_URL}/ai/trending-insights`).pipe(
      map(response => ({
        ...response,
        mostWatched: response.mostWatched.map(toVideoCardData),
        rising: response.rising.map(toVideoCardData)
      }))
    );
  }
}

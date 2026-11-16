import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { SKIP_RETRY } from '../api/retry.interceptor';
import { toVideoCardData } from '../videos/video-api.service';
import {
  AiChatReply,
  AiChatResponse,
  AiRecommendations,
  AiRecommendationsResponse,
  ChatMessage,
  TrendingInsights,
  TrendingInsightsResponse
} from './ai-insights.models';

export const MAX_CHAT_MESSAGE_LENGTH = 1000;

export function toTrendingInsights(response: TrendingInsightsResponse): TrendingInsights {
  return {
    ...response,
    mostWatched: response.mostWatched.map(toVideoCardData),
    rising: response.rising.map(toVideoCardData)
  };
}

export function toChatReply(response: AiChatResponse): AiChatReply {
  return { ...response, suggestions: response.suggestions.map(toVideoCardData) };
}

export function toRecommendations(response: AiRecommendationsResponse): AiRecommendations {
  return {
    ...response,
    recommendations: response.recommendations.map(item => ({ ...item, video: toVideoCardData(item.video) }))
  };
}

@Injectable({ providedIn: 'root' })
export class AiInsightsService {
  private readonly http = inject(HttpClient);
  private readonly aiUrl = `${API_BASE_URL}/ai`;

  getTrendingInsights(): Observable<TrendingInsights> {
    return this.http.get<TrendingInsightsResponse>(`${this.aiUrl}/trending-insights`).pipe(map(toTrendingInsights));
  }

  getRecommendations(category?: string): Observable<AiRecommendations> {
    const params = category ? new HttpParams().set('category', category) : undefined;
    return this.http.get<AiRecommendationsResponse>(`${this.aiUrl}/recommendations`, { params })
      .pipe(map(toRecommendations));
  }

  chat(messages: ChatMessage[]): Observable<AiChatReply> {
    return this.http.post<AiChatResponse>(`${this.aiUrl}/chat`, { messages }, {
      context: new HttpContext().set(SKIP_RETRY, true)
    }).pipe(map(toChatReply));
  }
}

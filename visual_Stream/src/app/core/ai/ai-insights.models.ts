import { VideoCardData, VideoResponse } from '../videos/video.models';

export type InsightsSource = 'ai' | 'kino-analytics';

export interface CategoryInsight {
  category: string;
  videoCount: number;
  totalViews: number;
}

export interface TrendingInsightsResponse {
  generatedAt: string;
  source: InsightsSource;
  summary: string;
  mostWatched: VideoResponse[];
  rising: VideoResponse[];
  topCategories: CategoryInsight[];
  totalViews: number;
  liveNow: number;
}

export interface TrendingInsights {
  generatedAt: string;
  source: InsightsSource;
  summary: string;
  mostWatched: VideoCardData[];
  rising: VideoCardData[];
  topCategories: CategoryInsight[];
  totalViews: number;
  liveNow: number;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AiChatResponse {
  reply: string;
  source: InsightsSource;
  suggestions: VideoResponse[];
  generatedAt: string;
}

export interface AiChatReply {
  reply: string;
  source: InsightsSource;
  suggestions: VideoCardData[];
  generatedAt: string;
}

export interface VideoRecommendationResponse {
  video: VideoResponse;
  reason: string;
  score: number;
}

export interface AiRecommendationsResponse {
  category: string;
  source: InsightsSource;
  summary: string;
  recommendations: VideoRecommendationResponse[];
  generatedAt: string;
}

export interface VideoRecommendation {
  video: VideoCardData;
  reason: string;
  score: number;
}

export interface AiRecommendations {
  category: string;
  source: InsightsSource;
  summary: string;
  recommendations: VideoRecommendation[];
  generatedAt: string;
}

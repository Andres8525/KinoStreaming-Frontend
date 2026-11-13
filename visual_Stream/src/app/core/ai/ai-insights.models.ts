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

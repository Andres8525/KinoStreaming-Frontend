export interface CreatorSummary {
  id: string;
  displayName: string;
}

export interface VideoResponse {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  tags: string[];
  accessPrice: number;
  suggestedDonation: number | null;
  creator: CreatorSummary;
  viewCount: number;
  createdAt: string;
}

export interface FeedResponse {
  strategy: string;
  generatedAt: string;
  recommendations: VideoResponse[];
}

export interface CreatorAnalyticsResponse {
  videoCount: number;
  totalViews: number;
  topVideos: VideoResponse[];
}

export interface CreateVideoRequest {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  accessPrice: number;
  suggestedDonation: number | null;
}

export interface VideoCardData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  creator: string;
  creatorAvatar: string;
  thumbnail: string;
  views: string;
  viewCount: number;
  duration: string;
  category: string;
  timeAgo: string;
  tags: string[];
  accessPrice: number;
  suggestedDonation: number | null;
}

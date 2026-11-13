import { CreatorSummary } from '../videos/video.models';

export type LiveStreamStatus = 'LIVE' | 'ENDED';

export interface LiveStreamResponse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  status: LiveStreamStatus;
  creator: CreatorSummary;
  startedAt: string;
  endedAt: string | null;
}

export interface StartLiveStreamRequest {
  title: string;
  description?: string;
  category: string;
  playbackUrl: string;
  thumbnailUrl?: string;
}

export interface LiveStreamData {
  id: string;
  title: string;
  description: string;
  category: string;
  playbackUrl: string;
  thumbnail: string;
  isLive: boolean;
  creator: string;
  creatorAvatar: string;
  startedAt: string;
  startedAgo: string;
  endedAt: string | null;
}

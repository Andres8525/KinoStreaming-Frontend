import { CreatorSummary } from '../videos/video.models';

export type LiveStreamStatus = 'LIVE' | 'ENDED';

export type LiveSourceType = 'CAMERA' | 'HLS';

export interface LiveStreamResponse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sourceType?: LiveSourceType;
  playbackUrl: string | null;
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
  sourceType: LiveSourceType;
  playbackUrl?: string;
  thumbnailUrl?: string;
}

export interface LiveStreamData {
  id: string;
  title: string;
  description: string;
  category: string;
  sourceType: LiveSourceType;
  playbackUrl: string;
  thumbnail: string;
  isLive: boolean;
  creator: string;
  creatorAvatar: string;
  startedAt: string;
  startedAgo: string;
  endedAt: string | null;
}

export interface PendingViewer {
  sessionId: string;
  viewerName: string;
  offer: string;
}

export interface LiveViewerSession {
  sessionId: string;
  answer: string | null;
}

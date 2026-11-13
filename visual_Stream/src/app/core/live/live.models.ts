import { CreatorSummary } from '../videos/video.models';

export type LiveStreamStatus = 'LIVE' | 'ENDED';

/** CAMERA: from the creator's browser over WebRTC · HLS: from OBS through an external media service. */
export type LiveSourceType = 'CAMERA' | 'HLS';

export interface LiveStreamResponse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  /** Missing in responses from older backends, which only supported HLS. */
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
  /** Required for HLS broadcasts only. */
  playbackUrl?: string;
  thumbnailUrl?: string;
}

export interface LiveStreamData {
  id: string;
  title: string;
  description: string;
  category: string;
  sourceType: LiveSourceType;
  /** Empty for camera broadcasts. */
  playbackUrl: string;
  thumbnail: string;
  isLive: boolean;
  creator: string;
  creatorAvatar: string;
  startedAt: string;
  startedAgo: string;
  endedAt: string | null;
}

/** A viewer waiting for the creator's browser to answer its WebRTC offer. */
export interface PendingViewer {
  sessionId: string;
  viewerName: string;
  offer: string;
}

/** A viewer's connection request; `answer` stays null until the creator's browser answers. */
export interface LiveViewerSession {
  sessionId: string;
  answer: string | null;
}

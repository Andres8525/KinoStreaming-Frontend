import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { formatTimeAgo, initials } from '../videos/video-format';
import {
  LiveStreamData, LiveStreamResponse, LiveViewerSession, PendingViewer, StartLiveStreamRequest
} from './live.models';

@Injectable({ providedIn: 'root' })
export class LiveApiService {
  private readonly http = inject(HttpClient);
  private readonly liveUrl = `${API_BASE_URL}/live`;
  private readonly creatorLiveUrl = `${API_BASE_URL}/creator/live`;

  /** Broadcasts that are live right now (public). */
  getLiveNow(): Observable<LiveStreamData[]> {
    return this.http.get<LiveStreamResponse[]>(this.liveUrl).pipe(map(streams => streams.map(toLiveStreamData)));
  }

  getStream(streamId: string): Observable<LiveStreamData> {
    return this.http.get<LiveStreamResponse>(`${this.liveUrl}/${encodeURIComponent(streamId)}`)
      .pipe(map(toLiveStreamData));
  }

  /** The signed-in creator's live broadcast, or null when offline (HTTP 204). */
  getMyCurrentStream(): Observable<LiveStreamData | null> {
    return this.http.get<LiveStreamResponse | null>(`${this.creatorLiveUrl}/current`)
      .pipe(map(stream => stream ? toLiveStreamData(stream) : null));
  }

  startStream(request: StartLiveStreamRequest): Observable<LiveStreamData> {
    return this.http.post<LiveStreamResponse>(this.creatorLiveUrl, request).pipe(map(toLiveStreamData));
  }

  /** Viewer: sends the WebRTC offer for a camera broadcast (requires a session). */
  requestViewing(streamId: string, offer: string): Observable<LiveViewerSession> {
    return this.http.post<LiveViewerSession>(`${this.liveUrl}/${encodeURIComponent(streamId)}/viewers`, { sdp: offer });
  }

  /** Viewer: polls for the creator's answer. */
  getViewerSession(streamId: string, sessionId: string): Observable<LiveViewerSession> {
    return this.http.get<LiveViewerSession>(
      `${this.liveUrl}/${encodeURIComponent(streamId)}/viewers/${encodeURIComponent(sessionId)}`);
  }

  /** Creator: viewers waiting for an answer. Polling it also tells Kino the camera is still on. */
  getPendingViewers(streamId: string): Observable<PendingViewer[]> {
    return this.http.get<PendingViewer[]>(`${this.creatorLiveUrl}/${encodeURIComponent(streamId)}/viewers/pending`);
  }

  /** Creator: sends the WebRTC answer for one viewer. */
  answerViewer(streamId: string, sessionId: string, answer: string): Observable<void> {
    return this.http.post<void>(
      `${this.creatorLiveUrl}/${encodeURIComponent(streamId)}/viewers/${encodeURIComponent(sessionId)}/answer`,
      { sdp: answer });
  }

  endStream(streamId: string): Observable<LiveStreamData> {
    return this.http.post<LiveStreamResponse>(`${this.creatorLiveUrl}/${encodeURIComponent(streamId)}/end`, {})
      .pipe(map(toLiveStreamData));
  }
}

export function toLiveStreamData(stream: LiveStreamResponse): LiveStreamData {
  return {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? '',
    category: stream.category,
    sourceType: stream.sourceType ?? 'HLS',
    playbackUrl: stream.playbackUrl ?? '',
    thumbnail: stream.thumbnailUrl ?? '',
    isLive: stream.status === 'LIVE',
    creator: stream.creator.displayName,
    creatorAvatar: initials(stream.creator.displayName),
    startedAt: stream.startedAt,
    startedAgo: formatTimeAgo(stream.startedAt),
    endedAt: stream.endedAt
  };
}

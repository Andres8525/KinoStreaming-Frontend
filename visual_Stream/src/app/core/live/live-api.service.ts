import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { formatTimeAgo, initials } from '../videos/video-format';
import { LiveStreamData, LiveStreamResponse, StartLiveStreamRequest } from './live.models';

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
    playbackUrl: stream.playbackUrl,
    thumbnail: stream.thumbnailUrl ?? '',
    isLive: stream.status === 'LIVE',
    creator: stream.creator.displayName,
    creatorAvatar: initials(stream.creator.displayName),
    startedAt: stream.startedAt,
    startedAgo: formatTimeAgo(stream.startedAt),
    endedAt: stream.endedAt
  };
}

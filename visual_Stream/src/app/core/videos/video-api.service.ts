import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import {
  CreateVideoRequest,
  CreatorAnalyticsResponse,
  FeedResponse,
  VideoCardData,
  VideoResponse
} from './video.models';
import { formatCount, formatTimeAgo, initials } from './video-format';

@Injectable({ providedIn: 'root' })
export class VideoApiService {
  private readonly http = inject(HttpClient);
  private readonly videosUrl = `${API_BASE_URL}/videos`;

  getCatalog(): Observable<VideoCardData[]> {
    return this.http.get<VideoResponse[]>(this.videosUrl).pipe(map(videos => videos.map(toVideoCardData)));
  }

  getTrending(): Observable<VideoCardData[]> {
    return this.http.get<VideoResponse[]>(`${this.videosUrl}/trending`).pipe(map(videos => videos.map(toVideoCardData)));
  }

  getRecommendations(): Observable<VideoCardData[]> {
    return this.http.get<FeedResponse>(`${API_BASE_URL}/feed/recommendations`)
      .pipe(map(feed => feed.recommendations.map(toVideoCardData)));
  }

  getVideo(videoId: string): Observable<VideoCardData> {
    return this.http.get<VideoResponse>(`${this.videosUrl}/${encodeURIComponent(videoId)}`)
      .pipe(map(toVideoCardData));
  }

  recordView(videoId: string): Observable<{ viewCount: number }> {
    return this.http.post<{ viewCount: number }>(
      `${this.videosUrl}/${encodeURIComponent(videoId)}/views`,
      {}
    );
  }

  getCreatorVideos(): Observable<VideoCardData[]> {
    return this.http.get<VideoResponse[]>(`${API_BASE_URL}/creator/videos`)
      .pipe(map(videos => videos.map(toVideoCardData)));
  }

  getCreatorAnalytics(): Observable<CreatorAnalyticsResponse> {
    return this.http.get<CreatorAnalyticsResponse>(`${API_BASE_URL}/creator/videos/analytics`);
  }

  deleteVideo(videoId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/creator/videos/${encodeURIComponent(videoId)}`);
  }

  publishVideo(request: CreateVideoRequest): Observable<VideoCardData> {
    return this.http.post<VideoResponse>(`${API_BASE_URL}/creator/videos`, request)
      .pipe(map(toVideoCardData));
  }
}

export function toVideoCardData(video: VideoResponse): VideoCardData {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    creator: video.creator.displayName,
    creatorAvatar: initials(video.creator.displayName),
    thumbnail: video.thumbnailUrl ?? '',
    views: formatCount(video.viewCount),
    viewCount: video.viewCount,
    duration: '',
    category: video.tags[0] ?? 'Sin categoría',
    timeAgo: formatTimeAgo(video.createdAt),
    tags: video.tags,
    accessPrice: video.accessPrice,
    suggestedDonation: video.suggestedDonation
  };
}

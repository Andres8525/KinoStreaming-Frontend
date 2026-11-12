import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VideoApiService } from './video-api.service';
import { VideoResponse } from './video.models';

describe('VideoApiService', () => {
  let service: VideoApiService;
  let httpTesting: HttpTestingController;

  const video: VideoResponse = {
    id: 'a7e4f43c-53d7-4af6-9090-97f6bf8dbbd7',
    title: 'Cine independiente',
    description: 'Una historia original.',
    videoUrl: 'https://cdn.example.com/video.mp4',
    thumbnailUrl: 'https://cdn.example.com/video.jpg',
    tags: ['Cortometraje', 'Indie'],
    accessPrice: 0,
    suggestedDonation: null,
    creator: { id: 'creator-id', displayName: 'Ana Ruiz' },
    viewCount: 1234,
    createdAt: '2026-11-10T12:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(VideoApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('maps backend recommendation and playback fields into the card model', () => {
    let result: unknown;
    service.getRecommendations().subscribe(videos => result = videos);

    httpTesting.expectOne('http://localhost:8080/api/feed/recommendations').flush({
      strategy: 'hybrid-collaborative-popularity',
      generatedAt: '2026-11-10T12:00:00Z',
      recommendations: [video]
    });

    expect(result).toEqual([expect.objectContaining({
      id: video.id,
      videoUrl: video.videoUrl,
      creator: 'Ana Ruiz',
      category: 'Cortometraje',
      viewCount: 1234,
      thumbnail: video.thumbnailUrl
    })]);
  });

  it('records a view for the selected video', () => {
    let result: unknown;
    service.recordView(video.id).subscribe(response => result = response);

    const request = httpTesting.expectOne(`http://localhost:8080/api/videos/${video.id}/views`);
    expect(request.request.method).toBe('POST');
    request.flush({ viewCount: 2 });

    expect(result).toEqual({ viewCount: 2 });
  });
});

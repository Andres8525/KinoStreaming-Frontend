import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  it('keeps the latest video when an earlier route request completes late', async () => {
    const routeParams = new Subject<ParamMap>();
    const firstResponse = new Subject<VideoCardData>();
    const secondResponse = new Subject<VideoCardData>();
    const videoApi = {
      getVideo: (id: string) => id === 'first' ? firstResponse : secondResponse,
      getTrending: () => of([]),
      recordView: () => of({ viewCount: 1 })
    };

    await TestBed.configureTestingModule({
      imports: [VideoPlayerComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: routeParams.asObservable() } },
        { provide: VideoApiService, useValue: videoApi },
        { provide: AuthService, useValue: { isAuthenticated: () => true } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(VideoPlayerComponent);
    fixture.detectChanges();
    routeParams.next(convertToParamMap({ id: 'first' }));
    routeParams.next(convertToParamMap({ id: 'second' }));
    secondResponse.next(createVideo('second'));
    firstResponse.next(createVideo('first'));

    expect(fixture.componentInstance.video()?.id).toBe('second');
  });
});

function createVideo(id: string): VideoCardData {
  return {
    id,
    title: `Video ${id}`,
    description: 'Una historia original.',
    videoUrl: 'https://cdn.example.com/video.mp4',
    creator: 'Ana Ruiz',
    creatorAvatar: 'AR',
    thumbnail: '',
    views: '1',
    viewCount: 1,
    duration: '',
    category: 'Cortometraje',
    timeAgo: '',
    tags: ['Cortometraje'],
    accessPrice: 0,
    suggestedDonation: null
  };
}

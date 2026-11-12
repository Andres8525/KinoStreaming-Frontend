import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { VideoApiService } from '../../core/videos/video-api.service';
import { CreateVideoRequest, CreatorAnalyticsResponse, VideoCardData } from '../../core/videos/video.models';
import { CreatorStudioComponent } from './creator-studio.component';

describe('CreatorStudioComponent', () => {
  let publishedRequests: CreateVideoRequest[];
  let publishResponse: Observable<VideoCardData>;

  beforeEach(async () => {
    publishedRequests = [];
    publishResponse = of(createVideo());
    await TestBed.configureTestingModule({
      imports: [CreatorStudioComponent],
      providers: [
        provideRouter([]),
        {
          provide: VideoApiService,
          useValue: {
            getCreatorVideos: () => of([]),
            getCreatorAnalytics: () => of(emptyAnalytics()),
            publishVideo: (request: CreateVideoRequest) => {
              publishedRequests.push(request);
              return publishResponse;
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('deduplicates category tags without case or accent differences', () => {
    const fixture = TestBed.createComponent(CreatorStudioComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.videoTitle.set('Una historia');
    component.videoDescription.set('Descripción de la historia.');
    component.videoUrl.set('https://cdn.example.com/video.mp4');
    component.selectedCategory.set('Cortometraje');
    component.tags.set(['cortometraje', 'Cortometráje', 'Indie']);

    component.publishVideo();

    expect(publishedRequests[0].tags).toEqual(['Cortometraje', 'Indie']);
  });

  it('ignores repeated submits while publishing is in progress', () => {
    const publishing = new Subject<VideoCardData>();
    publishResponse = publishing;
    const fixture = TestBed.createComponent(CreatorStudioComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.videoTitle.set('Una historia');
    component.videoDescription.set('Descripción de la historia.');
    component.videoUrl.set('https://cdn.example.com/video.mp4');
    component.selectedCategory.set('Cortometraje');

    component.publishVideo();
    component.publishVideo();

    expect(publishedRequests).toHaveLength(1);
    publishing.next(createVideo());
    publishing.complete();
  });
});

function emptyAnalytics(): CreatorAnalyticsResponse {
  return { videoCount: 0, totalViews: 0, topVideos: [] };
}

function createVideo(): VideoCardData {
  return {
    id: 'published',
    title: 'Una historia',
    description: 'Descripción de la historia.',
    videoUrl: 'https://cdn.example.com/video.mp4',
    creator: 'Ana Ruiz',
    creatorAvatar: 'AR',
    thumbnail: '',
    views: '0',
    viewCount: 0,
    duration: '',
    category: 'Cortometraje',
    timeAgo: '',
    tags: ['Cortometraje', 'Indie'],
    accessPrice: 0,
    suggestedDonation: null
  };
}

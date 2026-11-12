import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const musicVideo = createVideo('music', 'Música en vivo', ['Música']);
  const decomposedAnimationVideo = createVideo('animation', 'Animación', ['Animacio\u0301n']);
  let videoApi: {
    getCatalog: ReturnType<typeof vi.fn>;
    getTrending: ReturnType<typeof vi.fn>;
    getRecommendations: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    videoApi = {
      getCatalog: vi.fn(() => of([musicVideo, decomposedAnimationVideo])),
      getTrending: vi.fn(() => of([musicVideo, decomposedAnimationVideo])),
      getRecommendations: vi.fn(() => of([musicVideo, decomposedAnimationVideo]))
    };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) }
        },
        {
          provide: VideoApiService,
          useValue: videoApi
        }
      ]
    }).compileComponents();
  });

  it('matches search queries regardless of diacritics', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.searchTerm.set('musica');

    expect(fixture.componentInstance.searchResults().map(video => video.id)).toEqual(['music']);
  });

  it('matches decomposed accented tags when filtering categories', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    fixture.componentInstance.setCategory('Animación');

    expect(fixture.componentInstance.recommendedVideos().map(video => video.id)).toEqual(['animation']);
  });

  it('retries content requests after a failure', () => {
    videoApi.getCatalog
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of([musicVideo, decomposedAnimationVideo]));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errors()).toHaveLength(1);
    const retryButton = fixture.nativeElement.querySelector('.dashboard-retry') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(videoApi.getCatalog).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.errors()).toEqual([]);
    expect(fixture.componentInstance.catalog()).toHaveLength(2);
  });
});

function createVideo(id: string, title: string, tags: string[]): VideoCardData {
  return {
    id,
    title,
    description: 'Una historia original.',
    videoUrl: 'https://cdn.example.com/video.mp4',
    creator: 'Ana Ruiz',
    creatorAvatar: 'AR',
    thumbnail: '',
    views: '1',
    viewCount: 1,
    duration: '',
    category: tags[0] ?? 'Sin categoría',
    timeAgo: '',
    tags,
    accessPrice: 0,
    suggestedDonation: null
  };
}

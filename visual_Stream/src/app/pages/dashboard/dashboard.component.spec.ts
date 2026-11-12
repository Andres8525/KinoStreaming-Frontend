import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VideoApiService } from '../../core/videos/video-api.service';
import { VideoCardData } from '../../core/videos/video.models';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const musicVideo = createVideo('music', 'Música en vivo', ['Música']);
  const decomposedAnimationVideo = createVideo('animation', 'Animación', ['Animacio\u0301n']);

  beforeEach(async () => {
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
          useValue: {
            getCatalog: () => of([musicVideo, decomposedAnimationVideo]),
            getTrending: () => of([musicVideo, decomposedAnimationVideo]),
            getRecommendations: () => of([musicVideo, decomposedAnimationVideo])
          }
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

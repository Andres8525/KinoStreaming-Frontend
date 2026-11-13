import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
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
  let queryParams: Subject<ParamMap>;
  let isCreator = false;

  beforeEach(async () => {
    queryParams = new Subject<ParamMap>();
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
          useValue: { queryParamMap: queryParams.asObservable() }
        },
        {
          provide: VideoApiService,
          useValue: videoApi
        },
        { provide: AuthService, useValue: { isCreator: () => isCreator } }
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

  it('stops reacting to route search changes after destruction', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    fixture.destroy();
    queryParams.next(convertToParamMap({ q: 'ignored' }));

    expect(component.searchTerm()).toBe('');
  });

  it('links creators to Creator Studio and explains the role to viewers', () => {
    isCreator = true;
    const creatorFixture = TestBed.createComponent(DashboardComponent);
    creatorFixture.detectChanges();
    expect(creatorFixture.nativeElement.querySelector('.cta-card a[href="/creator-studio"]')).not.toBeNull();

    isCreator = false;
    const viewerFixture = TestBed.createComponent(DashboardComponent);
    viewerFixture.detectChanges();
    expect(viewerFixture.nativeElement.querySelector('.cta-card a[href="/creator-studio"]')).toBeNull();
    expect(viewerFixture.nativeElement.querySelector('.cta-card').textContent).toContain('rol de creador');
  });

  it('shows a notice after a creator-only redirect', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    queryParams.next(convertToParamMap({ notice: 'creator-only' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dashboard-notice')?.textContent).toContain('solo para cuentas de creador');
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

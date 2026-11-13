import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VideoCardData } from '../../core/videos/video.models';
import { VideoCardComponent } from './video-card.component';

describe('VideoCardComponent', () => {
  function render(accessPrice: number) {
    TestBed.configureTestingModule({ imports: [VideoCardComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(VideoCardComponent);
    fixture.componentRef.setInput('video', createVideo(accessPrice));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('labels free videos', () => {
    expect(render(0).querySelector('.price-badge')?.textContent?.trim()).toBe('Gratis');
  });

  it('shows the access price of paid videos', () => {
    const badge = render(4.99).querySelector('.price-badge');

    expect(badge?.textContent).toContain('4,99');
    expect(badge?.classList.contains('price-badge--free')).toBe(false);
  });

  it('links the card to the player', () => {
    expect(render(0).querySelector('a.card')?.getAttribute('href')).toBe('/watch/v1');
  });
});

function createVideo(accessPrice: number): VideoCardData {
  return {
    id: 'v1', title: 'Sombras', description: '', videoUrl: 'https://cdn.example.com/v.mp4',
    creator: 'Ana Ruiz', creatorAvatar: 'AR', thumbnail: '', views: '10', viewCount: 10, duration: '',
    category: 'Documental', timeAgo: '', tags: ['Documental'], accessPrice, suggestedDonation: null
  };
}

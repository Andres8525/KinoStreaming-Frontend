import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData } from '../../core/live/live.models';
import { LiveWatchComponent } from './live-watch.component';

describe('LiveWatchComponent', () => {
  async function render(getStream: () => unknown) {
    await TestBed.configureTestingModule({
      imports: [LiveWatchComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'stream-1' })) } },
        { provide: LiveApiService, useValue: { getStream } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(LiveWatchComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('plays a live broadcast and marks the tab as live', async () => {
    const fixture = await render(() => of(stream(true, 'https://cdn.example.com/live.mp4')));
    await fixture.whenStable();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;

    expect(video.src).toBe('https://cdn.example.com/live.mp4');
    expect(fixture.nativeElement.querySelector('.live-badge')?.textContent).toContain('EN VIVO');
    expect(TestBed.inject(Title).getTitle()).toBe('🔴 Ensayo abierto · Kino');
  });

  it('shows that an ended broadcast is over', async () => {
    const fixture = await render(() => of(stream(false, 'https://live.example.com/s.m3u8')));

    expect(fixture.nativeElement.querySelector('video')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La transmisión ha finalizado');
  });

  it('explains when the broadcast cannot be loaded', async () => {
    const fixture = await render(() => throwError(() => new Error('404')));

    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('No se encontró la transmisión');
  });
});

function stream(isLive: boolean, playbackUrl: string): LiveStreamData {
  return {
    id: 'stream-1', title: 'Ensayo abierto', description: 'Ensayo de la banda', category: 'Música', playbackUrl,
    thumbnail: '', isLive, creator: 'Ana Ruiz', creatorAvatar: 'AR', startedAt: '2026-11-12T11:00:00Z',
    startedAgo: 'hace 1 hora', endedAt: isLive ? null : '2026-11-12T12:00:00Z'
  };
}

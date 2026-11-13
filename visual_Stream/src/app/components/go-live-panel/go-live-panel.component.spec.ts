import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LiveApiService } from '../../core/live/live-api.service';
import { LiveStreamData } from '../../core/live/live.models';
import { GoLivePanelComponent } from './go-live-panel.component';

describe('GoLivePanelComponent', () => {
  let liveApi: {
    getMyCurrentStream: ReturnType<typeof vi.fn>;
    startStream: ReturnType<typeof vi.fn>;
    endStream: ReturnType<typeof vi.fn>;
  };

  async function render(current: LiveStreamData | null) {
    liveApi = {
      getMyCurrentStream: vi.fn(() => of(current)),
      startStream: vi.fn(() => of(stream())),
      endStream: vi.fn(() => of({ ...stream(), isLive: false }))
    };
    await TestBed.configureTestingModule({
      imports: [GoLivePanelComponent],
      providers: [provideRouter([]), { provide: LiveApiService, useValue: liveApi }]
    }).compileComponents();
    const fixture = TestBed.createComponent(GoLivePanelComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the start form when the creator is offline', async () => {
    const fixture = await render(null);

    expect(fixture.nativeElement.querySelector('#live-playback-url')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('¿Cómo transmitir?');
  });

  it('does not start with an invalid playback URL', async () => {
    const fixture = await render(null);
    fixture.componentInstance.form.setValue({
      title: 'Ensayo', category: 'Música', description: '', playbackUrl: 'rtmp://ingest', thumbnailUrl: ''
    });

    fixture.componentInstance.startStream();

    expect(liveApi.startStream).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasError('playbackUrl')).toBe(true);
  });

  it('starts a broadcast and shows its live status', async () => {
    const fixture = await render(null);
    fixture.componentInstance.form.setValue({
      title: ' Ensayo abierto ', category: 'Música', description: '', playbackUrl: 'https://live.example.com/s.m3u8',
      thumbnailUrl: ''
    });

    fixture.componentInstance.startStream();
    fixture.detectChanges();

    expect(liveApi.startStream).toHaveBeenCalledWith({
      title: 'Ensayo abierto', category: 'Música', playbackUrl: 'https://live.example.com/s.m3u8',
      description: undefined, thumbnailUrl: undefined
    });
    expect(fixture.nativeElement.querySelector('.status-badge')?.textContent).toContain('EN VIVO');
    expect(fixture.nativeElement.querySelector('a[href="/live/stream-1"]')).not.toBeNull();
  });

  it('shows the conflict message when another broadcast is active', async () => {
    const fixture = await render(null);
    liveApi.startStream.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Ya tienes una transmisión en vivo. Finalízala antes de iniciar otra.' }
    })));
    fixture.componentInstance.form.setValue({
      title: 'Ensayo', category: 'Música', description: '', playbackUrl: 'https://live.example.com/s.m3u8', thumbnailUrl: ''
    });

    fixture.componentInstance.startStream();

    expect(fixture.componentInstance.errorMessage()).toContain('Ya tienes una transmisión en vivo');
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('ends the current broadcast after confirmation', async () => {
    const fixture = await render(stream());
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.endStream();
    fixture.detectChanges();

    expect(liveApi.endStream).toHaveBeenCalledWith('stream-1');
    expect(fixture.componentInstance.currentStream()).toBeNull();
    expect(fixture.nativeElement.querySelector('#live-title')).not.toBeNull();
  });
});

function stream(): LiveStreamData {
  return {
    id: 'stream-1', title: 'Ensayo abierto', description: '', category: 'Música',
    playbackUrl: 'https://live.example.com/s.m3u8', thumbnail: '', isLive: true, creator: 'Ana Ruiz',
    creatorAvatar: 'AR', startedAt: '2026-11-12T11:00:00Z', startedAgo: 'hace 1 hora', endedAt: null
  };
}

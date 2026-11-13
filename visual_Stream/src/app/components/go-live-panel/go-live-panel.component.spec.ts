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
    getPendingViewers: ReturnType<typeof vi.fn>;
    answerViewer: ReturnType<typeof vi.fn>;
  };
  let cameraTrack: { stop: ReturnType<typeof vi.fn> };
  let getUserMedia: ReturnType<typeof vi.fn>;

  async function render(current: LiveStreamData | null) {
    liveApi = {
      getMyCurrentStream: vi.fn(() => of(current)),
      startStream: vi.fn(() => of(stream('HLS'))),
      endStream: vi.fn(() => of({ ...stream('HLS'), isLive: false })),
      getPendingViewers: vi.fn(() => of([])),
      answerViewer: vi.fn(() => of(undefined))
    };
    cameraTrack = { stop: vi.fn() };
    getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => [cameraTrack] }));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    await TestBed.configureTestingModule({
      imports: [GoLivePanelComponent],
      providers: [provideRouter([]), { provide: LiveApiService, useValue: liveApi }]
    }).compileComponents();
    const fixture = TestBed.createComponent(GoLivePanelComponent);
    fixture.detectChanges();
    return fixture;
  }

  const details = { title: ' Ensayo abierto ', category: 'Música', description: '', thumbnailUrl: '' };

  it('offers the camera by default and waits for it before going live', async () => {
    const fixture = await render(null);

    expect(fixture.nativeElement.textContent).toContain('Abrir cámara');
    expect(fixture.nativeElement.querySelector('#live-playback-url')).toBeNull();
    fixture.componentInstance.form.setValue({ ...details, playbackUrl: '' });
    fixture.componentInstance.startStream();

    expect(liveApi.startStream).not.toHaveBeenCalled();
    expect(fixture.componentInstance.cameraError()).toContain('Abre tu cámara');
  });

  it('opens the camera and goes live from the browser', async () => {
    const fixture = await render(null);
    liveApi.startStream.mockReturnValue(of(stream('CAMERA')));

    expect(await fixture.componentInstance.openCamera()).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: expect.anything(), audio: expect.anything() }));
    fixture.componentInstance.form.setValue({ ...details, playbackUrl: '' });
    fixture.componentInstance.startStream();
    fixture.detectChanges();

    expect(liveApi.startStream).toHaveBeenCalledWith({
      title: 'Ensayo abierto', category: 'Música', sourceType: 'CAMERA', playbackUrl: undefined,
      description: undefined, thumbnailUrl: undefined
    });
    expect(fixture.componentInstance.broadcaster()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.viewer-count')?.textContent).toContain('0 espectadores');
    await vi.waitFor(() => expect(liveApi.getPendingViewers).toHaveBeenCalledWith('stream-1'));

    fixture.destroy();
    expect(cameraTrack.stop).toHaveBeenCalled();
  });

  it('explains when the camera permission is denied', async () => {
    const fixture = await render(null);
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    expect(await fixture.componentInstance.openCamera()).toBe(false);
    expect(fixture.componentInstance.cameraError()).toContain('permitir el acceso a la cámara');
  });

  it('lets a creator resume the camera after reloading during a camera broadcast', async () => {
    const fixture = await render(stream('CAMERA'));

    expect(fixture.nativeElement.textContent).toContain('Reanudar cámara');
    await fixture.componentInstance.resumeCamera();

    expect(fixture.componentInstance.broadcaster()).not.toBeNull();
    fixture.destroy();
  });

  it('requires a valid HLS URL when streaming with OBS', async () => {
    const fixture = await render(null);
    fixture.componentInstance.setMode('hls');
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ ...details, playbackUrl: 'rtmp://ingest' });

    fixture.componentInstance.startStream();

    expect(fixture.nativeElement.querySelector('#live-playback-url')).not.toBeNull();
    expect(liveApi.startStream).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasError('playbackUrl')).toBe(true);
  });

  it('starts an HLS broadcast and shows its live status', async () => {
    const fixture = await render(null);
    fixture.componentInstance.setMode('hls');
    fixture.componentInstance.form.setValue({ ...details, playbackUrl: 'https://live.example.com/s.m3u8' });

    fixture.componentInstance.startStream();
    fixture.detectChanges();

    expect(liveApi.startStream).toHaveBeenCalledWith({
      title: 'Ensayo abierto', category: 'Música', sourceType: 'HLS', playbackUrl: 'https://live.example.com/s.m3u8',
      description: undefined, thumbnailUrl: undefined
    });
    expect(fixture.nativeElement.querySelector('.status-badge')?.textContent).toContain('EN VIVO');
    expect(fixture.nativeElement.querySelector('a[href="/live/stream-1"]')).not.toBeNull();
  });

  it('shows the conflict message when another broadcast is active', async () => {
    const fixture = await render(null);
    fixture.componentInstance.setMode('hls');
    liveApi.startStream.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Ya tienes una transmisión en vivo. Finalízala antes de iniciar otra.' }
    })));
    fixture.componentInstance.form.setValue({ ...details, playbackUrl: 'https://live.example.com/s.m3u8' });

    fixture.componentInstance.startStream();

    expect(fixture.componentInstance.errorMessage()).toContain('Ya tienes una transmisión en vivo');
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('ends the current broadcast after confirmation', async () => {
    const fixture = await render(stream('HLS'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.endStream();
    fixture.detectChanges();

    expect(liveApi.endStream).toHaveBeenCalledWith('stream-1');
    expect(fixture.componentInstance.currentStream()).toBeNull();
    expect(fixture.nativeElement.querySelector('#live-title')).not.toBeNull();
  });
});

function stream(sourceType: 'CAMERA' | 'HLS'): LiveStreamData {
  return {
    id: 'stream-1', title: 'Ensayo abierto', description: '', category: 'Música', sourceType,
    playbackUrl: sourceType === 'HLS' ? 'https://live.example.com/s.m3u8' : '', thumbnail: '', isLive: true,
    creator: 'Ana Ruiz', creatorAvatar: 'AR', startedAt: '2026-11-12T11:00:00Z', startedAgo: 'hace 1 hora', endedAt: null
  };
}

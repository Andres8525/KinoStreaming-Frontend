import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.constants';
import { LiveApiService } from './live-api.service';
import { LiveStreamData, LiveStreamResponse } from './live.models';

describe('LiveApiService', () => {
  let service: LiveApiService;
  let httpTesting: HttpTestingController;

  const response: LiveStreamResponse = {
    id: 'stream-1',
    title: 'Ensayo abierto',
    description: null,
    category: 'Música',
    playbackUrl: 'https://live.example.com/stream.m3u8',
    thumbnailUrl: null,
    status: 'LIVE',
    creator: { id: 'creator-1', displayName: 'Ana Ruiz' },
    startedAt: new Date().toISOString(),
    endedAt: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LiveApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists live broadcasts mapped for the UI', () => {
    let streams: LiveStreamData[] = [];
    service.getLiveNow().subscribe(result => streams = result);

    httpTesting.expectOne(`${API_BASE_URL}/live`).flush([response]);

    expect(streams[0]).toEqual(expect.objectContaining({
      id: 'stream-1', isLive: true, creator: 'Ana Ruiz', creatorAvatar: 'AR', description: '', thumbnail: ''
    }));
  });

  it('returns null when the creator is offline (204)', () => {
    let current: LiveStreamData | null | undefined;
    service.getMyCurrentStream().subscribe(result => current = result);

    httpTesting.expectOne(`${API_BASE_URL}/creator/live/current`).flush(null, { status: 204, statusText: 'No Content' });

    expect(current).toBeNull();
  });

  it('starts and ends a broadcast', () => {
    service.startStream({ title: 'Ensayo abierto', category: 'Música', playbackUrl: response.playbackUrl }).subscribe();
    const start = httpTesting.expectOne(`${API_BASE_URL}/creator/live`);
    expect(start.request.method).toBe('POST');
    expect(start.request.body.title).toBe('Ensayo abierto');
    start.flush(response);

    let ended: LiveStreamData | undefined;
    service.endStream('stream-1').subscribe(result => ended = result);
    httpTesting.expectOne(`${API_BASE_URL}/creator/live/stream-1/end`)
      .flush({ ...response, status: 'ENDED', endedAt: new Date().toISOString() });

    expect(ended?.isLive).toBe(false);
  });
});

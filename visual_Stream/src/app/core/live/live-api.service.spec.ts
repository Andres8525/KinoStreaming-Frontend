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
    sourceType: 'HLS',
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
    service.startStream({
      title: 'Ensayo abierto', category: 'Música', sourceType: 'HLS', playbackUrl: response.playbackUrl ?? undefined
    }).subscribe();
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

  it('maps camera broadcasts without a playback URL', () => {
    let streams: LiveStreamData[] = [];
    service.getLiveNow().subscribe(result => streams = result);

    httpTesting.expectOne(`${API_BASE_URL}/live`).flush([{ ...response, sourceType: 'CAMERA', playbackUrl: null }]);

    expect(streams[0]).toEqual(expect.objectContaining({ sourceType: 'CAMERA', playbackUrl: '' }));
  });

  it('treats broadcasts from older backends as HLS', () => {
    let streams: LiveStreamData[] = [];
    service.getLiveNow().subscribe(result => streams = result);

    const { sourceType: _ignored, ...legacy } = response;
    httpTesting.expectOne(`${API_BASE_URL}/live`).flush([legacy]);

    expect(streams[0].sourceType).toBe('HLS');
  });

  it('relays the WebRTC offer and answer of a camera broadcast', () => {
    service.requestViewing('stream-1', 'offer-sdp').subscribe();
    const offer = httpTesting.expectOne(`${API_BASE_URL}/live/stream-1/viewers`);
    expect(offer.request.method).toBe('POST');
    expect(offer.request.body).toEqual({ sdp: 'offer-sdp' });
    offer.flush({ sessionId: 's1', answer: null });

    service.getViewerSession('stream-1', 's1').subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/live/stream-1/viewers/s1`).flush({ sessionId: 's1', answer: 'answer-sdp' });

    service.getPendingViewers('stream-1').subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/creator/live/stream-1/viewers/pending`).flush([]);

    service.answerViewer('stream-1', 's1', 'answer-sdp').subscribe();
    const answer = httpTesting.expectOne(`${API_BASE_URL}/creator/live/stream-1/viewers/s1/answer`);
    expect(answer.request.body).toEqual({ sdp: 'answer-sdp' });
    answer.flush(null, { status: 204, statusText: 'No Content' });
  });
});

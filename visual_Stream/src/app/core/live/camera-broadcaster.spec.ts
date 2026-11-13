import { of, throwError } from 'rxjs';
import { CameraBroadcaster } from './camera-broadcaster';
import { LiveApiService } from './live-api.service';

class FakePeer extends EventTarget {
  connectionState: RTCPeerConnectionState = 'new';
  iceGatheringState: RTCIceGatheringState = 'complete';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  readonly tracks: unknown[] = [];
  closed = false;

  addTrack(track: unknown): void { this.tracks.push(track); }
  async createAnswer(): Promise<RTCSessionDescriptionInit> { return { type: 'answer', sdp: 'answer-sdp' }; }
  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> { this.localDescription = description; }
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> { this.remoteDescription = description; }
  close(): void { this.closed = true; this.connectionState = 'closed'; }
  setState(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    this.dispatchEvent(new Event('connectionstatechange'));
  }
}

describe('CameraBroadcaster', () => {
  const track = { kind: 'video' };
  const media = { getTracks: () => [track] } as unknown as MediaStream;
  let peers: FakePeer[];
  let liveApi: { getPendingViewers: ReturnType<typeof vi.fn>; answerViewer: ReturnType<typeof vi.fn> };
  let broadcaster: CameraBroadcaster;

  beforeEach(() => {
    peers = [];
    liveApi = {
      getPendingViewers: vi.fn(() => of([{ sessionId: 's1', viewerName: 'Edison', offer: 'offer-sdp' }])),
      answerViewer: vi.fn(() => of(undefined))
    };
    broadcaster = new CameraBroadcaster(liveApi as unknown as LiveApiService, 'stream-1', media, () => {
      const peer = new FakePeer();
      peers.push(peer);
      return peer as unknown as RTCPeerConnection;
    });
  });

  afterEach(() => broadcaster.stop());

  it('answers each waiting viewer with the camera tracks', async () => {
    broadcaster.start();

    await vi.waitFor(() => expect(liveApi.answerViewer).toHaveBeenCalledWith('stream-1', 's1', 'answer-sdp'));
    expect(peers).toHaveLength(1);
    expect(peers[0].remoteDescription).toEqual({ type: 'offer', sdp: 'offer-sdp' });
    expect(peers[0].tracks).toEqual([track]);
  });

  it('counts connected viewers and does not answer the same viewer twice', async () => {
    broadcaster.start();
    await vi.waitFor(() => expect(liveApi.answerViewer).toHaveBeenCalledTimes(1));

    peers[0].setState('connected');
    await broadcaster.poll();

    expect(broadcaster.viewerCount()).toBe(1);
    expect(peers).toHaveLength(1);

    peers[0].setState('failed');
    expect(broadcaster.viewerCount()).toBe(0);
  });

  it('closes every connection when the broadcast stops', async () => {
    broadcaster.start();
    await vi.waitFor(() => expect(liveApi.answerViewer).toHaveBeenCalled());

    broadcaster.stop();

    expect(peers[0].closed).toBe(true);
    expect(broadcaster.viewerCount()).toBe(0);
  });

  it('reports a lost connection with Kino and keeps trying', async () => {
    liveApi.getPendingViewers.mockReturnValue(throwError(() => new Error('offline')));

    broadcaster.start();

    await vi.waitFor(() => expect(broadcaster.connectionProblem()).toBe(true));
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CameraViewer } from './camera-viewer';
import { LiveApiService } from './live-api.service';

class FakePeer extends EventTarget {
  connectionState: RTCPeerConnectionState = 'new';
  iceGatheringState: RTCIceGatheringState = 'complete';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  readonly transceivers: { kind: string; direction?: string }[] = [];
  closed = false;

  addTransceiver(kind: string, init?: RTCRtpTransceiverInit): void {
    this.transceivers.push({ kind, direction: init?.direction });
  }
  async createOffer(): Promise<RTCSessionDescriptionInit> { return { type: 'offer', sdp: 'offer-sdp' }; }
  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> { this.localDescription = description; }
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> { this.remoteDescription = description; }
  close(): void { this.closed = true; this.connectionState = 'closed'; }
  setState(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    this.dispatchEvent(new Event('connectionstatechange'));
  }
}

describe('CameraViewer', () => {
  let peers: FakePeer[];
  let liveApi: { requestViewing: ReturnType<typeof vi.fn>; getViewerSession: ReturnType<typeof vi.fn> };
  let onStream: ReturnType<typeof vi.fn<(stream: MediaStream) => void>>;
  let viewer: CameraViewer;

  beforeEach(() => {
    peers = [];
    onStream = vi.fn<(stream: MediaStream) => void>();
    liveApi = {
      requestViewing: vi.fn(() => of({ sessionId: 's1', answer: null })),
      getViewerSession: vi.fn()
        .mockReturnValueOnce(of({ sessionId: 's1', answer: null }))
        .mockReturnValue(of({ sessionId: 's1', answer: 'answer-sdp' }))
    };
    viewer = new CameraViewer(liveApi as unknown as LiveApiService, 'stream-1', onStream, () => {
      const peer = new FakePeer();
      peers.push(peer);
      return peer as unknown as RTCPeerConnection;
    }, () => Promise.resolve());
  });

  afterEach(() => viewer.stop());

  it('sends a receive-only offer and applies the creator answer', async () => {
    await viewer.connect();

    expect(liveApi.requestViewing).toHaveBeenCalledWith('stream-1', 'offer-sdp');
    expect(peers[0].transceivers).toEqual([
      { kind: 'video', direction: 'recvonly' }, { kind: 'audio', direction: 'recvonly' }
    ]);
    expect(peers[0].remoteDescription).toEqual({ type: 'answer', sdp: 'answer-sdp' });
  });

  it('hands the incoming camera stream to the player once connected', async () => {
    await viewer.connect();
    const stream = { id: 'camera' };

    peers[0].dispatchEvent(Object.assign(new Event('track'), { streams: [stream], track: {} }));
    peers[0].setState('connected');

    expect(onStream).toHaveBeenCalledWith(stream);
    expect(viewer.state()).toBe('connected');
  });

  it('waits for the creator when their camera is not connected', async () => {
    liveApi.requestViewing.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    await viewer.connect();

    expect(viewer.state()).toBe('waiting');
    expect(peers[0].closed).toBe(true);
  });

  it('retries when the connection fails', async () => {
    await viewer.connect();

    peers[0].setState('failed');

    expect(viewer.state()).toBe('failed');
    expect(peers[0].closed).toBe(true);
  });
});

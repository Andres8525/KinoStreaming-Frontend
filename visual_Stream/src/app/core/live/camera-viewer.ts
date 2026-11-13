import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LiveApiService } from './live-api.service';
import { createPeerConnection, PeerFactory, waitForIceGathering } from './webrtc';

export const ANSWER_POLL_MS = 1_000;
export const ANSWER_ATTEMPTS = 25;
export const RETRY_DELAY_MS = 5_000;

export type CameraViewerState = 'connecting' | 'connected' | 'waiting' | 'failed';

export class CameraViewer {
  readonly state = signal<CameraViewerState>('connecting');

  private peer: RTCPeerConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private attempt = 0;

  constructor(
    private readonly liveApi: LiveApiService,
    private readonly streamId: string,
    private readonly onStream: (stream: MediaStream) => void,
    private readonly createPeer: PeerFactory = createPeerConnection,
    private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))
  ) {}

  async connect(): Promise<void> {
    if (this.stopped) {
      return;
    }
    const attempt = ++this.attempt;
    this.closePeer();
    this.state.set('connecting');

    const peer = this.createPeer();
    this.peer = peer;
    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.addTransceiver('audio', { direction: 'recvonly' });
    peer.addEventListener('track', event => {
      this.onStream(event.streams[0] ?? new MediaStream([event.track]));
    });
    peer.addEventListener('connectionstatechange', () => {
      if (this.peer !== peer) {
        return;
      }
      if (peer.connectionState === 'connected') {
        this.state.set('connected');
      } else if (peer.connectionState === 'failed') {
        this.retry('failed');
      }
    });

    try {
      await peer.setLocalDescription(await peer.createOffer());
      await waitForIceGathering(peer);
      const session = await firstValueFrom(this.liveApi.requestViewing(this.streamId, peer.localDescription?.sdp ?? ''));
      const answer = await this.waitForAnswer(session.sessionId, attempt);
      if (attempt !== this.attempt || this.stopped) {
        return;
      }
      if (!answer) {
        this.retry('waiting');
        return;
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (error) {
      if (attempt === this.attempt) {
        this.retry(error instanceof HttpErrorResponse && error.status === 409 ? 'waiting' : 'failed');
      }
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.closePeer();
  }

  private async waitForAnswer(sessionId: string, attempt: number): Promise<string | null> {
    for (let poll = 0; poll < ANSWER_ATTEMPTS; poll++) {
      if (attempt !== this.attempt || this.stopped) {
        return null;
      }
      const session = await firstValueFrom(this.liveApi.getViewerSession(this.streamId, sessionId));
      if (session.answer) {
        return session.answer;
      }
      await this.sleep(ANSWER_POLL_MS);
    }
    return null;
  }

  private retry(state: CameraViewerState): void {
    if (this.stopped) {
      return;
    }
    this.state.set(state);
    this.closePeer();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = setTimeout(() => void this.connect(), RETRY_DELAY_MS);
  }

  private closePeer(): void {
    this.peer?.close();
    this.peer = null;
  }
}

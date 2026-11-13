import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LiveApiService } from './live-api.service';
import { PendingViewer } from './live.models';
import { createPeerConnection, PeerFactory, waitForIceGathering } from './webrtc';

/** How often the creator's browser asks Kino for new viewers (also the heartbeat that keeps the broadcast listed). */
export const BROADCAST_POLL_MS = 2_000;

/**
 * Creator side of a camera broadcast. Polls Kino for viewers that want to watch, answers each one with a
 * WebRTC connection that carries the camera and microphone tracks, and keeps count of connected viewers.
 * The video goes directly from this browser to each viewer, so the tab must stay open while live.
 */
export class CameraBroadcaster {
  readonly viewerCount = signal(0);
  readonly connectionProblem = signal(false);

  private readonly peers = new Map<string, RTCPeerConnection>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly liveApi: LiveApiService,
    private readonly streamId: string,
    private readonly media: MediaStream,
    private readonly createPeer: PeerFactory = createPeerConnection
  ) {}

  start(): void {
    if (!this.running) {
      this.running = true;
      void this.poll();
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.peers.forEach(peer => peer.close());
    this.peers.clear();
    this.viewerCount.set(0);
  }

  /** One polling round; exposed for tests. */
  async poll(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      const pending = await firstValueFrom(this.liveApi.getPendingViewers(this.streamId));
      this.connectionProblem.set(false);
      for (const viewer of pending) {
        if (this.running && !this.peers.has(viewer.sessionId)) {
          await this.answer(viewer);
        }
      }
    } catch {
      this.connectionProblem.set(true);
    }
    if (this.running) {
      this.timer = setTimeout(() => void this.poll(), BROADCAST_POLL_MS);
    }
  }

  private async answer(viewer: PendingViewer): Promise<void> {
    const peer = this.createPeer();
    this.peers.set(viewer.sessionId, peer);
    peer.addEventListener('connectionstatechange', () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        this.drop(viewer.sessionId, peer);
      }
      this.updateViewerCount();
    });
    this.media.getTracks().forEach(track => peer.addTrack(track, this.media));

    try {
      await peer.setRemoteDescription({ type: 'offer', sdp: viewer.offer });
      await peer.setLocalDescription(await peer.createAnswer());
      await waitForIceGathering(peer);
      await firstValueFrom(this.liveApi.answerViewer(this.streamId, viewer.sessionId, peer.localDescription?.sdp ?? ''));
    } catch {
      this.drop(viewer.sessionId, peer);
    }
  }

  private drop(sessionId: string, peer: RTCPeerConnection): void {
    if (this.peers.get(sessionId) === peer) {
      this.peers.delete(sessionId);
    }
    peer.close();
    this.updateViewerCount();
  }

  private updateViewerCount(): void {
    this.viewerCount.set([...this.peers.values()].filter(peer => peer.connectionState === 'connected').length);
  }
}

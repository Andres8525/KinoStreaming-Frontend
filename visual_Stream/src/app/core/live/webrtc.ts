import { environment } from '../../../environments/environment';

/** How long to wait for ICE candidates before sending a session description anyway. */
export const ICE_GATHERING_TIMEOUT_MS = 4_000;

export type PeerFactory = () => RTCPeerConnection;

export const createPeerConnection: PeerFactory = () => new RTCPeerConnection({ iceServers: environment.iceServers });

/** True when this browser can take part in camera broadcasts. */
export function supportsWebRtc(): boolean {
  return typeof RTCPeerConnection !== 'undefined';
}

/**
 * Kino relays a single offer and a single answer (no trickle ICE), so the candidates must be inside the
 * session description: wait until gathering completes, or send what was gathered after a timeout.
 */
export function waitForIceGathering(peer: RTCPeerConnection, timeoutMs = ICE_GATHERING_TIMEOUT_MS): Promise<void> {
  if (peer.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const done = (): void => {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = (): void => {
      if (peer.iceGatheringState === 'complete') {
        done();
      }
    };
    const timer = setTimeout(done, timeoutMs);
    peer.addEventListener('icegatheringstatechange', onChange);
  });
}

/** Spanish explanation for a getUserMedia failure. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Debes permitir el acceso a la cámara y al micrófono en tu navegador para transmitir.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No encontramos una cámara o micrófono conectados a este dispositivo.';
    case 'NotReadableError':
    case 'AbortError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    default:
      return 'No se pudo abrir la cámara. Revisa los permisos del navegador e inténtalo de nuevo.';
  }
}

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

export interface SocketEnvelope<T = unknown> {
  type: string;
  requestId?: string;
  data: T;
}

export class SocketReplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocketReplyError';
  }
}

export const PING_INTERVAL_MS = 25_000;
export const MAX_RECONNECT_DELAY_MS = 30_000;
export const SOCKET_REQUEST_TIMEOUT_MS = 30_000;

export type WebSocketFactory = (url: string) => WebSocket;

export const WEB_SOCKET_FACTORY = new InjectionToken<WebSocketFactory | null>('WEB_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => typeof WebSocket === 'undefined' ? null : (url: string) => new WebSocket(url)
});

export function toSocketUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/api\/?$/, '').replace(/^http/, 'ws')}/ws/kino`;
}

export function reconnectDelay(attempt: number): number {
  return Math.min(MAX_RECONNECT_DELAY_MS, 1_000 * 2 ** attempt);
}

@Injectable({ providedIn: 'root' })
export class KinoSocketService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly factory = inject(WEB_SOCKET_FACTORY);
  private readonly url = toSocketUrl(API_BASE_URL);
  private readonly messages = new Subject<SocketEnvelope>();
  private socket: WebSocket | null = null;
  private attempts = 0;
  private wanted = false;
  private requestCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  readonly status = signal<SocketStatus>('idle');
  readonly messages$ = this.messages.asObservable();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  connect(): void {
    if (!this.isBrowser || !this.factory || this.socket) {
      return;
    }
    this.wanted = true;
    this.open();
  }

  disconnect(): void {
    this.wanted = false;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    if (this.status() !== 'idle') {
      this.status.set('closed');
    }
  }

  on<T>(type: string): Observable<T> {
    return this.messages$.pipe(filter(message => message.type === type), map(message => message.data as T));
  }

  send(message: object): boolean {
    if (!this.socket || this.status() !== 'open') {
      return false;
    }
    this.socket.send(JSON.stringify(message));
    return true;
  }

  request<T>(type: string, payload: object, replyType: string, errorType: string,
             timeoutMs = SOCKET_REQUEST_TIMEOUT_MS): Observable<T> {
    return new Observable<T>(subscriber => {
      const requestId = `${Date.now().toString(36)}-${++this.requestCounter}`;
      const subscription = this.messages$
        .pipe(filter(message => message.requestId === requestId))
        .subscribe(message => {
          if (message.type === replyType) {
            subscriber.next(message.data as T);
            subscriber.complete();
          } else if (message.type === errorType) {
            const data = message.data as { message?: string } | null;
            subscriber.error(new SocketReplyError(data?.message ?? 'No se pudo completar la solicitud.'));
          }
        });
      const timer = setTimeout(() => subscriber.error(new Error('timeout')), timeoutMs);
      if (!this.send({ ...payload, type, requestId })) {
        subscriber.error(new Error('closed'));
      }
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    });
  }

  private open(): void {
    if (!this.factory) {
      return;
    }
    this.status.set('connecting');
    let socket: WebSocket;
    try {
      socket = this.factory(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.attempts = 0;
      this.status.set('open');
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_INTERVAL_MS);
    };
    socket.onmessage = event => {
      try {
        const message: unknown = JSON.parse(String(event.data));
        if (typeof message === 'object' && message !== null && 'type' in message && typeof message.type === 'string') {
          this.messages.next(message as SocketEnvelope);
        }
      } catch {
        return;
      }
    };
    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.clearTimers();
      this.status.set('closed');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.wanted) {
      return;
    }
    const delay = reconnectDelay(this.attempts++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wanted && !this.socket) {
        this.open();
      }
    }, delay);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

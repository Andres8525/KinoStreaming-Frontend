import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';
import { blockedOriginMessage, CONNECTION_ERROR_MESSAGE, localBackendMessage } from './api-error';
import { API_BASE_URL } from './api.constants';

/**
 * unknown: not checked yet · waking: waiting for the first answer · online / offline: last result ·
 * blocked: the server answers, but not to this page's address (CORS).
 */
export type ServerState = 'unknown' | 'waking' | 'online' | 'offline' | 'blocked';

/** A sleeping free-tier backend (Render) can take close to a minute to answer its first request. */
export const WAKE_UP_TIMEOUT_MS = 90_000;

const LOCAL_API = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

/**
 * Wakes the backend up as soon as the app opens, so that by the time the user submits the login or
 * registration form the server is already running, and exposes its state to show helpful messages.
 */
@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly http = inject(HttpClient);
  private pending: Observable<boolean> | null = null;

  readonly state = signal<ServerState>('unknown');

  /** Pings /api/health once; concurrent callers share the same request. Emits true when online. */
  wakeUp(): Observable<boolean> {
    if (this.state() === 'online') {
      return of(true);
    }
    if (!this.pending) {
      this.state.set('waking');
      this.pending = this.http.get<{ status: string }>(`${API_BASE_URL}/health`).pipe(
        timeout(WAKE_UP_TIMEOUT_MS),
        map(health => health.status === 'UP'),
        catchError(() => of(false)),
        tap(online => this.state.set(online ? 'online' : 'offline')),
        finalize(() => this.pending = null),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.pending;
  }

  /**
   * Finds out why a request failed without an answer. A browser reports a CORS rejection exactly like a
   * server that is down (status 0), so after a failed health check the server is contacted once more in
   * `no-cors` mode: that request cannot be read, but it succeeds whenever the server answered.
   */
  async diagnose(): Promise<ServerState> {
    if (await firstValueFrom(this.wakeUp())) {
      return 'online';
    }
    if (await this.answersIgnoringCors()) {
      this.state.set('blocked');
    }
    return this.state();
  }

  /** The message to show after a connection error (`isConnectionError`), based on `diagnose()`. */
  async connectionErrorMessage(): Promise<string> {
    const state = await this.diagnose();
    if (state === 'blocked') {
      return blockedOriginMessage(globalThis.location?.origin ?? 'esta dirección');
    }
    if (state === 'offline' && LOCAL_API.test(`${API_BASE_URL}/`)) {
      return localBackendMessage(API_BASE_URL);
    }
    return CONNECTION_ERROR_MESSAGE;
  }

  private async answersIgnoringCors(): Promise<boolean> {
    if (typeof fetch !== 'function') {
      return false;
    }
    try {
      await fetch(`${API_BASE_URL}/health`, { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch {
      return false;
    }
  }
}

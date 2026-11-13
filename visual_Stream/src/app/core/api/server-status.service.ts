import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';
import { API_BASE_URL } from './api.constants';

/** unknown: not checked yet · waking: waiting for the first answer · online / offline: last result. */
export type ServerState = 'unknown' | 'waking' | 'online' | 'offline';

/** A sleeping free-tier backend (Render) can take close to a minute to answer its first request. */
export const WAKE_UP_TIMEOUT_MS = 90_000;

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
}

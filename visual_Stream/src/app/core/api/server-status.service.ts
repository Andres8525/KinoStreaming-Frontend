import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  catchError, filter, finalize, firstValueFrom, interval, map, Observable, of, shareReplay, Subscription, switchMap, tap,
  timeout
} from 'rxjs';
import { blockedOriginMessage, CONNECTION_ERROR_MESSAGE, localBackendMessage } from './api-error';
import { API_BASE_URL } from './api.constants';
import { SKIP_RETRY } from './retry.interceptor';

export type ServerState = 'unknown' | 'waking' | 'online' | 'offline' | 'blocked';

export const WAKE_UP_TIMEOUT_MS = 90_000;

export const KEEP_WARM_INTERVAL_MS = 10 * 60_000;

export const DIAGNOSE_TIMEOUT_MS = 15_000;

const LOCAL_API = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly http = inject(HttpClient);
  private pending: Observable<boolean> | null = null;

  readonly state = signal<ServerState>('unknown');

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

  keepWarm(intervalMs = KEEP_WARM_INTERVAL_MS): Subscription {
    return interval(intervalMs).pipe(
      filter(() => typeof document === 'undefined' || document.visibilityState === 'visible'),
      switchMap(() => this.http.get<{ status: string }>(`${API_BASE_URL}/health`).pipe(
        map(health => health.status === 'UP'),
        catchError(() => of(false))
      ))
    ).subscribe(online => this.state.set(online ? 'online' : 'offline'));
  }

  async diagnose(): Promise<ServerState> {
    const online = await firstValueFrom(this.http.get<{ status: string }>(`${API_BASE_URL}/health`, {
      context: new HttpContext().set(SKIP_RETRY, true)
    }).pipe(
      timeout(DIAGNOSE_TIMEOUT_MS),
      map(health => health.status === 'UP'),
      catchError(() => of(false))
    ));
    if (online) {
      this.state.set('online');
    } else {
      this.state.set(await this.answersIgnoringCors() ? 'blocked' : 'offline');
    }
    return this.state();
  }

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

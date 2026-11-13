import { HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';
import { isConnectionError } from './api-error';
import { API_BASE_URL } from './api.constants';

/** Waits before each retry; long enough for a sleeping backend to finish starting. */
export const RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000];

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/**
 * Retries read-only API requests that failed to reach the backend (network error or 502/503/504),
 * which is what happens while a free-tier server is waking up. Writes (POST, DELETE…) are never
 * retried automatically so an action such as creating an account cannot run twice.
 */
export const retryInterceptor: HttpInterceptorFn = (request, next) => {
  if (!SAFE_METHODS.has(request.method) || !request.url.startsWith(`${API_BASE_URL}/`)) {
    return next(request);
  }

  return next(request).pipe(
    retry({
      count: RETRY_DELAYS_MS.length,
      delay: (error: unknown, attempt: number) =>
        isConnectionError(error) ? timer(RETRY_DELAYS_MS[attempt - 1]) : throwError(() => error)
    })
  );
};

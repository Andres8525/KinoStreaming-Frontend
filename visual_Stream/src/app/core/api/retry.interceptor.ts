import { HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';
import { isConnectionError } from './api-error';
import { API_BASE_URL } from './api.constants';

export const RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000];

const SAFE_METHODS = new Set(['GET', 'HEAD']);

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

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { AuthService } from './auth.service';

/**
 * When the API rejects the session (401) — expired token, revoked or deleted account —
 * clears the local session and sends the user to the login page, keeping the current URL
 * so they come back after signing in. Login/register errors are left to their forms.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isApiRequest = request.url.startsWith(`${API_BASE_URL}/`);
  const isAuthRequest = request.url.startsWith(`${API_BASE_URL}/auth/`);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest && !isAuthRequest
        && request.headers.has('Authorization')) {
        authService.logout();
        const returnUrl = router.url.startsWith('/login') ? undefined : router.url;
        void router.navigate(['/login'], { queryParams: { returnUrl, expired: 1 } });
      }
      return throwError(() => error);
    })
  );
};

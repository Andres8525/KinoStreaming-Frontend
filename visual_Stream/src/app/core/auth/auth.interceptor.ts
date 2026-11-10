import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

const API_BASE_URL = 'http://localhost:8080/api/';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const isApiRequest = request.url.startsWith('/api/') || request.url.startsWith(API_BASE_URL);
  const token = isBrowser ? authService.getToken() : null;

  if (!isApiRequest || !token) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};

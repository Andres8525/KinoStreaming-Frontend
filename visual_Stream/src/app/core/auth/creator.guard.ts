import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protects Creator Studio. Every signed-in account can publish and go live; signed-out users go to the
 * login page (and come back afterwards).
 */
export const creatorGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return authService.isCreator() ? true : router.createUrlTree(['/'], { queryParams: { notice: 'creator-only' } });
};

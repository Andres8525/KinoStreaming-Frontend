import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Lets only CREATOR accounts open creator pages. Signed-out users go to the login
 * page (and come back afterwards); viewers are sent to the dashboard.
 */
export const creatorGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return authService.isCreator() ? true : router.createUrlTree(['/'], { queryParams: { notice: 'creator-only' } });
};

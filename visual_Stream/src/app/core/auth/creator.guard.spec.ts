import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { creatorGuard } from './creator.guard';

describe('creatorGuard', () => {
  function run(authenticated: boolean, creator: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated, isCreator: () => creator } }
      ]
    });
    return TestBed.runInInjectionContext(() =>
      creatorGuard({} as ActivatedRouteSnapshot, { url: '/creator-studio' } as RouterStateSnapshot));
  }

  it('allows creators', () => {
    expect(run(true, true)).toBe(true);
  });

  it('sends viewers to the dashboard', () => {
    const result = run(true, false) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/?notice=creator-only');
  });

  it('sends signed-out users to login with a return URL', () => {
    const result = run(false, false) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fcreator-studio');
  });
});

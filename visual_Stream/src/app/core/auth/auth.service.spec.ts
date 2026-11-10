import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthResponse } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const response: AuthResponse = {
    accessToken: 'test.jwt.token',
    tokenType: 'Bearer',
    email: 'viewer@example.com',
    role: 'VIEWER'
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('stores the login token and publishes the profile', () => {
    let profile: unknown;
    service.user$.subscribe(user => profile = user);

    service.login({ email: response.email, password: 'secure-password' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush(response);

    expect(service.getToken()).toBe(response.accessToken);
    expect(profile).toEqual({ email: response.email, role: response.role });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the session on logout', () => {
    sessionStorage.setItem('kino.accessToken', response.accessToken);
    sessionStorage.setItem('kino.user', JSON.stringify({ email: response.email, role: response.role }));

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('kino.user')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});

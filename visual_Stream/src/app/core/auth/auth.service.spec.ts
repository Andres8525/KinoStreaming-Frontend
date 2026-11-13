import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.constants';
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
    httpTesting.expectOne(`${API_BASE_URL}/auth/login`).flush(response);

    expect(service.getToken()).toBe(response.accessToken);
    expect(profile).toEqual({ email: response.email, role: response.role });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('reports the creator role of the current user', () => {
    expect(service.isCreator()).toBe(false);

    service.login({ email: response.email, password: 'secure-password' }).subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/auth/login`).flush({ ...response, role: 'CREATOR' });

    expect(service.currentUser()).toEqual({ email: response.email, role: 'CREATOR' });
    expect(service.isCreator()).toBe(true);
  });

  it('drops an expired stored token and its profile', () => {
    const claims = btoa(JSON.stringify({ sub: response.email, exp: Math.floor(Date.now() / 1000) - 60 }));
    sessionStorage.setItem('kino.accessToken', `header.${claims.replace(/=+$/, '')}.signature`);
    sessionStorage.setItem('kino.user', JSON.stringify({ email: response.email, role: response.role }));

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('kino.user')).toBeNull();
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

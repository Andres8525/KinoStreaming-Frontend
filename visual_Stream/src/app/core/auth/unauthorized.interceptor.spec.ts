import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../api/api.constants';
import { AuthService } from './auth.service';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logout = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { logout } },
        { provide: Router, useValue: { url: '/watch/42', navigate } }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('signs out and redirects to login on a rejected session', () => {
    http.get(`${API_BASE_URL}/feed/recommendations`, { headers: { Authorization: 'Bearer old' } })
      .subscribe({ error: () => undefined });
    httpTesting.expectOne(`${API_BASE_URL}/feed/recommendations`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/watch/42', expired: 1 } });
  });

  it('ignores wrong credentials on the login endpoint', () => {
    http.post(`${API_BASE_URL}/auth/login`, {}).subscribe({ error: () => undefined });
    httpTesting.expectOne(`${API_BASE_URL}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores other errors and anonymous requests', () => {
    http.get(`${API_BASE_URL}/videos/1`, { headers: { Authorization: 'Bearer t' } }).subscribe({ error: () => undefined });
    httpTesting.expectOne(`${API_BASE_URL}/videos/1`).flush({}, { status: 404, statusText: 'Not Found' });
    http.post(`${API_BASE_URL}/videos/1/views`, {}).subscribe({ error: () => undefined });
    httpTesting.expectOne(`${API_BASE_URL}/videos/1/views`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logout).not.toHaveBeenCalled();
  });
});

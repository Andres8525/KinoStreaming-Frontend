import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.constants';
import { retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  const url = `${API_BASE_URL}/videos`;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([retryInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('retries a read while the server wakes up and then succeeds', () => {
    let result: unknown;
    http.get(url).subscribe(value => result = value);

    httpTesting.expectOne(url).error(new ProgressEvent('error'));
    vi.advanceTimersByTime(2_000);
    httpTesting.expectOne(url).flush(null, { status: 503, statusText: 'Service Unavailable' });
    vi.advanceTimersByTime(5_000);
    httpTesting.expectOne(url).flush([{ id: 'v1' }]);

    expect(result).toEqual([{ id: 'v1' }]);
  });

  it('gives up after the configured retries', () => {
    let error: HttpErrorResponse | undefined;
    http.get(url).subscribe({ error: (e: HttpErrorResponse) => error = e });

    httpTesting.expectOne(url).flush(null, { status: 502, statusText: 'Bad Gateway' });
    vi.advanceTimersByTime(2_000);
    httpTesting.expectOne(url).flush(null, { status: 502, statusText: 'Bad Gateway' });
    vi.advanceTimersByTime(5_000);
    httpTesting.expectOne(url).flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(error?.status).toBe(502);
  });

  it('does not retry answers from the API', () => {
    let error: HttpErrorResponse | undefined;
    http.get(`${url}/missing`).subscribe({ error: (e: HttpErrorResponse) => error = e });

    httpTesting.expectOne(`${url}/missing`).flush({ message: 'No se encontró el video' }, { status: 404, statusText: 'Not Found' });
    vi.advanceTimersByTime(10_000);

    httpTesting.expectNone(`${url}/missing`);
    expect(error?.status).toBe(404);
  });

  it('never retries writes such as registering an account', () => {
    let error: HttpErrorResponse | undefined;
    http.post(`${API_BASE_URL}/auth/register`, {}).subscribe({ error: (e: HttpErrorResponse) => error = e });

    httpTesting.expectOne(`${API_BASE_URL}/auth/register`).error(new ProgressEvent('error'));
    vi.advanceTimersByTime(10_000);

    httpTesting.expectNone(`${API_BASE_URL}/auth/register`);
    expect(error?.status).toBe(0);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.constants';
import { ServerStatusService } from './server-status.service';

describe('ServerStatusService', () => {
  let service: ServerStatusService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ServerStatusService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pings the health endpoint once for concurrent callers', () => {
    const results: boolean[] = [];
    service.wakeUp().subscribe(online => results.push(online));
    service.wakeUp().subscribe(online => results.push(online));

    expect(service.state()).toBe('waking');
    httpTesting.expectOne(`${API_BASE_URL}/health`).flush({ status: 'UP' });

    expect(results).toEqual([true, true]);
    expect(service.state()).toBe('online');
  });

  it('does not ping again once the server is online', () => {
    service.wakeUp().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/health`).flush({ status: 'UP' });

    let online = false;
    service.wakeUp().subscribe(result => online = result);

    httpTesting.expectNone(`${API_BASE_URL}/health`);
    expect(online).toBe(true);
  });

  it('reports offline when the server cannot be reached and allows retrying', () => {
    let online: boolean | undefined;
    service.wakeUp().subscribe(result => online = result);
    httpTesting.expectOne(`${API_BASE_URL}/health`).error(new ProgressEvent('error'));

    expect(online).toBe(false);
    expect(service.state()).toBe('offline');

    service.wakeUp().subscribe();
    httpTesting.expectOne(`${API_BASE_URL}/health`).flush({ status: 'UP' });
    expect(service.state()).toBe('online');
  });
});

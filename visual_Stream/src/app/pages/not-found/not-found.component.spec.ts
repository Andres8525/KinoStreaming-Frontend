import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('is shown for unknown URLs', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/esta-ruta-no-existe', NotFoundComponent);

    expect(page).toBeInstanceOf(NotFoundComponent);
    expect(harness.routeNativeElement?.textContent).toContain('Esta página no existe');
  });

  it('links back to the dashboard', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/otra-ruta', NotFoundComponent);

    expect(harness.routeNativeElement?.querySelector('a[href="/"]')?.textContent).toContain('Volver al inicio');
  });
});

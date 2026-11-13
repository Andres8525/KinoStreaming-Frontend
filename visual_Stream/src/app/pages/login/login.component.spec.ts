import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ServerState, ServerStatusService } from '../../core/api/server-status.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginComponent } from './login.component';

const serverState = signal<ServerState>('online');

describe('LoginComponent', () => {
  let login: ReturnType<typeof vi.fn>;

  async function setup(queryParams: Record<string, string> = {}) {
    login = vi.fn();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: ServerStatusService, useValue: { state: serverState } },
        { provide: AuthService, useValue: { login } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('does not call the API while the form is invalid', async () => {
    const fixture = await setup();

    fixture.componentInstance.submit();

    expect(login).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('navigates to a safe return URL after signing in', async () => {
    const fixture = await setup({ returnUrl: '/watch/7' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    login.mockReturnValue(of({}));
    fixture.componentInstance.form.setValue({ email: 'viewer@example.com', password: 'secret-123' });

    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/watch/7');
  });

  it('ignores external return URLs', async () => {
    const fixture = await setup({ returnUrl: '//evil.example.com' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    login.mockReturnValue(of({}));
    fixture.componentInstance.form.setValue({ email: 'viewer@example.com', password: 'secret-123' });

    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the backend error message', async () => {
    const fixture = await setup();
    login.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 401, error: { message: 'Correo o contraseña incorrectos' }
    })));
    fixture.componentInstance.form.setValue({ email: 'viewer@example.com', password: 'wrong-pass' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Correo o contraseña incorrectos');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('explains that the session expired', async () => {
    const fixture = await setup({ expired: '1' });

    expect(fixture.nativeElement.querySelector('[role=status]')?.textContent).toContain('Tu sesión ha caducado');
  });
});

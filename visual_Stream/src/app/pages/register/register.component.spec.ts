import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ServerState, ServerStatusService } from '../../core/api/server-status.service';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterComponent } from './register.component';

const serverState = signal<ServerState>('online');

describe('RegisterComponent', () => {
  let register: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    register = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: ServerStatusService, useValue: { state: serverState } },
        { provide: AuthService, useValue: { register } }]
    }).compileComponents();
  });

  it('requires a password of at least 8 characters', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.form.setValue({ displayName: 'Ana', email: 'ana@example.com', password: 'short' });

    fixture.componentInstance.submit();

    expect(register).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.password.hasError('minlength')).toBe(true);
  });

  it('creates the account and opens the dashboard', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    register.mockReturnValue(of({}));
    const values = { displayName: 'Ana', email: 'ana@example.com', password: 'secure-password' };
    fixture.componentInstance.form.setValue(values);

    fixture.componentInstance.submit();

    expect(register).toHaveBeenCalledWith(values);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the conflict message for an existing email', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    register.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'El correo ya está registrado' }
    })));
    fixture.componentInstance.form.setValue({ displayName: 'Ana', email: 'ana@example.com', password: 'secure-password' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorMessage()).toBe('El correo ya está registrado');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('shows backend field errors under the matching field', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    register.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Revisa los campos enviados', validationErrors: { email: 'Debe ser una dirección de correo válida' } }
    })));
    fixture.componentInstance.form.setValue({ displayName: 'Ana', email: 'ana@example.com', password: 'secure-password' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    const emailField = (fixture.nativeElement as HTMLElement).querySelector('#email')!.parentElement!;
    expect(emailField.textContent).toContain('Debe ser una dirección de correo válida');
    expect(fixture.componentInstance.errorMessage()).toBe('Revisa los campos enviados');
  });

  it('clears previous backend field errors when submitting again', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.serverErrors.set({ email: 'antiguo error' });
    register.mockReturnValue(of({}));
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({ displayName: 'Ana', email: 'ana@example.com', password: 'secure-password' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.serverErrors()).toEqual({});
  });
});

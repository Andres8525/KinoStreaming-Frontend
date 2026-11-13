import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let register: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    register = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }]
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
});

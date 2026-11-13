import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServerStatusService } from '../../core/api/server-status.service';
import { apiErrorMessage, apiValidationErrors } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  /** Lets the form explain a slow first request while a sleeping backend starts. */
  readonly serverState = inject(ServerStatusService).state;
  readonly errorMessage = signal('');
  /** Field errors returned by the backend (400), keyed by form control name. */
  readonly serverErrors = signal<Record<string, string>>({});
  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]]
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.serverErrors.set({});
    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
        this.serverErrors.set(apiValidationErrors(error));
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false)
    });
  }
}

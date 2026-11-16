import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServerStatusService } from '../../core/api/server-status.service';
import { apiErrorMessage, isConnectionError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  private readonly serverStatus = inject(ServerStatusService);
  readonly serverState = this.serverStatus.state;
  readonly errorMessage = signal('');
  readonly sessionExpired = this.route.snapshot.queryParamMap.has('expired');
  private retriedAfterWakeUp = false;
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', Validators.required]
  });

  submit(): void {
    this.retriedAfterWakeUp = false;
    this.send();
  }

  private send(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/';
        void this.router.navigateByUrl(destination);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
        this.submitting.set(false);
        if (isConnectionError(error)) {
          void this.serverStatus.connectionErrorMessage().then(message => {
            if (this.serverStatus.state() === 'online' && !this.retriedAfterWakeUp) {
              this.retriedAfterWakeUp = true;
              this.send();
              return;
            }
            this.errorMessage.set(message);
          });
        }
      },
      complete: () => this.submitting.set(false)
    });
  }
}

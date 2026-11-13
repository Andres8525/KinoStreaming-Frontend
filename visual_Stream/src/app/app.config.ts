import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';
import { unauthorizedInterceptor } from './core/auth/unauthorized.interceptor';
import { KinoTitleStrategy } from './core/routing/kino-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: KinoTitleStrategy },
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, unauthorizedInterceptor])),
    provideClientHydration(withEventReplay())
  ]
};

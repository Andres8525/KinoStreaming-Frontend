import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api.constants';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from './auth.models';
import { isTokenExpired } from './jwt';

const API_URL = `${API_BASE_URL}/auth`;
const TOKEN_KEY = 'kino.accessToken';
const USER_KEY = 'kino.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly userSubject = new BehaviorSubject<UserProfile | null>(this.readUser());
  readonly user$ = this.userSubject.asObservable();

  login(request: LoginRequest) {
    return this.http.post<AuthResponse>(`${API_URL}/login`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  register(request: RegisterRequest) {
    return this.http.post<AuthResponse>(`${API_URL}/register`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token && isTokenExpired(token)) {
      this.clearSession();
      return null;
    }
    return token;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /** Current profile, or null when signed out. */
  currentUser(): UserProfile | null {
    return this.isAuthenticated() ? this.userSubject.value : null;
  }

  /**
   * True when the signed-in account can publish videos and go live. Every account can (the backend creates
   * them as CREATOR and accepts older VIEWER accounts too), so this only requires a session.
   */
  isCreator(): boolean {
    return this.currentUser() !== null;
  }

  logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    if (this.isBrowser) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    // getToken() can run while userSubject is being initialised.
    this.userSubject?.next(null);
  }

  private saveSession(response: AuthResponse): void {
    const user: UserProfile = { email: response.email, role: response.role };
    if (this.isBrowser) {
      sessionStorage.setItem(TOKEN_KEY, response.accessToken);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    this.userSubject.next(user);
  }

  private readUser(): UserProfile | null {
    if (!this.isBrowser || !this.getToken()) {
      return null;
    }

    const storedUser = sessionStorage.getItem(USER_KEY);
    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (
        typeof user === 'object' &&
        user !== null &&
        'email' in user &&
        typeof user.email === 'string' &&
        'role' in user &&
        (user.role === 'CREATOR' || user.role === 'VIEWER')
      ) {
        return { email: user.email, role: user.role };
      }
    } catch {
      sessionStorage.removeItem(USER_KEY);
    }
    return null;
  }
}

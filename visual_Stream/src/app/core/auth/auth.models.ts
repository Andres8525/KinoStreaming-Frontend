export type UserRole = 'CREATOR' | 'VIEWER';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  email: string;
  role: UserRole;
}

export interface UserProfile {
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  displayName: string;
}

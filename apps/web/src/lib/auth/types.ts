/**
 * Auth-related TypeScript types.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  status: string;
  credits: number;
  email_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { AuthState, AuthUser } from "./types";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setTokens,
  setUser as storeUser,
} from "./storage";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    const stored = getStoredUser();
    const token = getAccessToken();
    if (stored && token) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      storeUser(data.user);
      setUser(data.user);

      // Redirect based on role
      if (
        data.user.role === "ADMIN" ||
        data.user.role === "SUPER_ADMIN"
      ) {
        router.push("/admin");
      } else {
        router.push("/app");
      }
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        const detail = data.detail;
        if (typeof detail === "string") {
          throw new Error(detail);
        } else if (Array.isArray(detail)) {
          throw new Error(detail[0]?.msg || "Validation error");
        }
        throw new Error("Registration failed");
      }

      // Redirect to login after successful registration
      router.push("/login?registered=true");
    },
    [router]
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Best-effort server-side logout
      try {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore errors — we clear local state regardless
      }
    }
    clearAuth();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        // Refresh token invalid — force logout
        clearAuth();
        setUser(null);
        return null;
      }

      const data = await res.json();
      setTokens(data.access_token, refreshToken);
      return data.access_token;
    } catch {
      return null;
    }
  }, []);

  const isAuthenticated = !!user;
  const isAdmin =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

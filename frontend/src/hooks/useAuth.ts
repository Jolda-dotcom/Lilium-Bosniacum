import { useCallback, useEffect, useState } from "react";

interface AuthUser {
  id: number;
  username: string;
  role: string;
}

interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

interface LoginResponse {
  authenticated: boolean;
  user: AuthUser;
}

export function useAuth(baseUrl = "") {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setCheckingSession(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/auth/status`, {
        credentials: "include",
      });
      const data = (await response.json()) as AuthStatusResponse & { sessionCookie?: boolean };

      setAuthenticated(Boolean(data.authenticated));
      setUser(data.authenticated ? data.user : null);
      if (!data.authenticated && data.sessionCookie === false) {
        setError("Sesija nije pronađena: provjeri da li je cookie connect.sid postavljen.");
      }
    } catch (authError) {
      setAuthenticated(false);
      setUser(null);
      setError(authError instanceof Error ? authError.message : "Unable to check authentication status.");
    } finally {
      setCheckingSession(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as LoginResponse | { error?: string };

      if (!response.ok) {
        const message = "error" in data && data.error ? data.error : "Login failed.";
        throw new Error(message);
      }

      const loginData = data as LoginResponse;
      setAuthenticated(Boolean(loginData.authenticated));
      setUser(loginData.authenticated ? loginData.user : null);
      return loginData;
    } catch (authError) {
      setAuthenticated(false);
      setUser(null);
      const message = authError instanceof Error ? authError.message : "Login failed.";
      setError(message);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setAuthenticated(false);
      setUser(null);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Logout failed.";
      setError(message);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  return {
    user,
    authenticated,
    loading,
    checkingSession,
    error,
    login,
    logout,
    refreshSession,
  };
}

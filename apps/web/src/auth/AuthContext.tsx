import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  AUTH_CHANGED_EVENT,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../api';
import type { UserInfo } from '../types';

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string, hCaptchaToken?: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        setReady(true);
        return;
      }
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        clearTokens();
        setToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncToken = () => {
      const accessToken = getAccessToken();
      setToken(accessToken);
      if (!accessToken && !getRefreshToken()) setUser(null);
    };
    window.addEventListener(AUTH_CHANGED_EVENT, syncToken);
    window.addEventListener('storage', syncToken);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncToken);
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, hCaptchaToken?: string) => {
    const result = await api.login({ email, password, hCaptchaToken });
    setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      const result = await api.register(input);
      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      setToken(result.accessToken);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await api.logout(refresh);
      } catch {
        /* abaikan */
      }
    }
    clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

interface AuthUser {
  userId: string;
  username: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('locker_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setUser(parsed.user);
        } else {
          localStorage.removeItem('locker_session');
        }
      } catch {
        localStorage.removeItem('locker_session');
      }
    }
    setIsLoading(false);
  }, []);

  const persistSession = (user: AuthUser) => {
    const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem('locker_session', JSON.stringify({ user, expiresAt }));
    setUser(user);
  };

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed.');

persistSession({ userId: username, username, token: data.token });
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed.');

    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('locker_session');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
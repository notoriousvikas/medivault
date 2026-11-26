import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user: User | null }>;
  register: (userData: Record<string, any>) => Promise<{ success: boolean; user: User | null }>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  updateUserData: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const getStoredToken = () => localStorage.getItem('ayuraksha_token') || localStorage.getItem('medivault_token');
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate user profile on load
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const savedToken = getStoredToken();
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await authApi.getMe();
      const userData: User | null = response.data || response.user || null;
      setUser(userData);
      return userData;
    } catch (err: any) {
      console.warn('Failed to hydrate user from session:', err.message);
      // If token is invalid or expired
      localStorage.removeItem('ayuraksha_token');
      localStorage.removeItem('medivault_token');
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const authToken: string | undefined = res.token || res.data?.token;
      const authUser: User | null = res.data?.user || res.user || res.data || null;

      if (authToken) {
        localStorage.setItem('ayuraksha_token', authToken);
        localStorage.setItem('medivault_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
        const uid = authUser._id || authUser.id;
        if (uid && !localStorage.getItem(`ayuraksha_tour_done_${uid}`)) {
          localStorage.setItem('ayuraksha_pending_tour', 'true');
        }
      }
      return { success: true, user: authUser };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Record<string, any>) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(userData);
      const authToken: string | undefined = res.token || res.data?.token;
      const authUser: User | null = res.data?.user || res.user || res.data || null;

      if (authToken) {
        localStorage.setItem('ayuraksha_token', authToken);
        localStorage.setItem('medivault_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
        const uid = authUser._id || authUser.id;
        if (uid && !localStorage.getItem(`ayuraksha_tour_done_${uid}`)) {
          localStorage.setItem('ayuraksha_pending_tour', 'true');
        }
      }
      return { success: true, user: authUser };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ayuraksha_token');
    localStorage.removeItem('medivault_token');
    setToken(null);
    setUser(null);
  };

  const updateUserData = (updatedFields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : (updatedFields as User)));
  };

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

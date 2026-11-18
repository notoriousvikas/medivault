import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('medivault_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user profile on load
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('medivault_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await authApi.getMe();
      const userData = response.data || response.user;
      setUser(userData);
      return userData;
    } catch (err) {
      console.warn('Failed to hydrate user from session:', err.message);
      // If token is invalid or expired
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

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const authToken = res.token || res.data?.token;
      const authUser = res.data?.user || res.user || res.data;

      if (authToken) {
        localStorage.setItem('medivault_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
      }
      return { success: true, user: authUser };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(userData);
      const authToken = res.token || res.data?.token;
      const authUser = res.data?.user || res.user || res.data;

      if (authToken) {
        localStorage.setItem('medivault_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
      }
      return { success: true, user: authUser };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('medivault_token');
    setToken(null);
    setUser(null);
  };

  const updateUserData = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  const value = {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

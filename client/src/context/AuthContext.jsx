import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef';
import { authService } from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null
  );
  const [refreshToken, setRefreshToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null
  );
  const [loading, setLoading] = useState(true);

  // Clear local credentials helper
  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  // Listen for forced logout event triggered by axios interceptor if refresh token expires
  useEffect(() => {
    const handleForcedLogout = () => {
      clearAuth();
    };

    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [clearAuth]);

  // Validate active session on initial app boot
  useEffect(() => {
    const initAuth = async () => {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (storedAccessToken || storedRefreshToken) {
        try {
          // Verify session against backend /api/v1/auth/me
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
        } catch (err) {
          console.warn('Initial session restoration failed:', err?.message);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [clearAuth]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    const { access_token, refresh_token, user: userData } = data;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      setRefreshToken(refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

    setAccessToken(access_token);
    setUser(userData);
    return data;
  };

  const register = async (userDataPayload) => {
    const data = await authService.register(userDataPayload);
    const { access_token, refresh_token, user: userData } = data;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      setRefreshToken(refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

    setAccessToken(access_token);
    setUser(userData);
    return data;
  };

  const logout = async () => {
    const currentRefreshToken = refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    try {
      await authService.logout(currentRefreshToken);
    } finally {
      clearAuth();
    }
  };

  const refreshUser = useCallback(async () => {
    const token = accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      console.error('Failed to refresh user stats:', err);
      return null;
    }
  }, [accessToken]);

  const value = {
    user,
    token: accessToken,
    accessToken,
    refreshToken,
    loading,
    isAuthenticated: Boolean(user && (accessToken || refreshToken)),
    login,
    register,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

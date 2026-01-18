'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import type { AuthContextType, LoginRequest } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem('authToken');
    console.log('Auth Context - Token from localStorage:', !!savedToken, savedToken ? 'Length: ' + savedToken.length : 'No token');
    if (savedToken) {
      setToken(savedToken);
      console.log('Auth Context - Token set, user is authenticated');
    } else {
      console.log('Auth Context - No token found, user not authenticated');
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Auth Context - Attempting login for:', username);
      const response = await api.post<{ token: string }>('/auth/login', {
        username,
        password,
      });
      
      const { token: authToken } = response.data;
      console.log('Auth Context - Login successful, token received:', !!authToken, 'Length:', authToken?.length);
      
      // Set token in state first
      setToken(authToken);
      // Then store in localStorage
      localStorage.setItem('authToken', authToken);
      console.log('Auth Context - Token saved to localStorage and state updated');
      
      // Verify token was saved correctly
      const savedToken = localStorage.getItem('authToken');
      console.log('Auth Context - Token verification - saved correctly:', savedToken === authToken);
      
      return true;
    } catch (error) {
      console.error('Auth Context - Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  const value: AuthContextType = {
    isAuthenticated: !!token,
    token,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

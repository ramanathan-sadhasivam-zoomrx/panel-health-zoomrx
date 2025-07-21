"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user: string;
  email: string;
  name: string;
  accessToken: string;
  idToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if authentication is disabled for development
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  const checkAuth = async (): Promise<boolean> => {
    try {
      // If auth is disabled, always return true (authenticated)
      if (isAuthDisabled) {
        console.log('🔧 Development mode: Authentication disabled');
        setUser({
          user: 'Development User',
          email: 'dev@zoomrx.com',
          name: 'Development User',
          accessToken: 'dev-token',
          idToken: 'dev-id-token'
        });
        return true;
      }

      // Check if user exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  };

  const login = () => {
    // If auth is disabled, go directly to dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Direct access to dashboard');
      router.push('/');
      return;
    }
    router.push('/login');
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    
    // If auth is disabled, stay on dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Logout ignored');
      return;
    }
    
    router.push('/login');
  };

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      await checkAuth();
      
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: isAuthDisabled ? true : !!user, // Always authenticated in dev mode
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
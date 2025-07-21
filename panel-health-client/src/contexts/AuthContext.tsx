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
  console.log('🔄 AuthProvider: Component rendering');
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if authentication is disabled for development
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  const checkAuth = async (): Promise<boolean> => {
    console.log('🔄 AuthProvider: checkAuth called');
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
    console.log('🔄 AuthProvider: Auth useEffect running');
    let isMounted = true;
    
    const initAuth = async () => {
      console.log('🔄 AuthProvider: initAuth called', { isMounted });
      if (!isMounted) {
        console.log('🔄 AuthProvider: initAuth skipped - not mounted');
        return;
      }
      
      console.log('🔄 AuthProvider: Setting loading to true');
      setIsLoading(true);
      await checkAuth();
      
      if (isMounted) {
        console.log('🔄 AuthProvider: Setting loading to false');
        setIsLoading(false);
      } else {
        console.log('🔄 AuthProvider: Skipping setLoading(false) - not mounted');
      }
    };

    initAuth();
    
    return () => {
      console.log('🔄 AuthProvider: Auth useEffect cleanup - setting isMounted to false');
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
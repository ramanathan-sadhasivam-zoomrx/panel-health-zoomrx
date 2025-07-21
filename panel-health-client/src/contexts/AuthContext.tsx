"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
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
        try {
          const userData = JSON.parse(storedUser);
          
          // Check if token is expired (if we have expiry info)
          if (userData.expiresAt && new Date() > new Date(userData.expiresAt)) {
            console.log('🔄 AuthProvider: Token expired, clearing user data');
            localStorage.removeItem('user');
            setUser(null);
            return false;
          }
          
          console.log('🔄 AuthProvider: Valid user found in localStorage');
          setUser(userData);
          return true;
        } catch (parseError) {
          console.error('🔄 AuthProvider: Error parsing stored user data:', parseError);
          localStorage.removeItem('user');
          setUser(null);
          return false;
        }
      }
      
      console.log('🔄 AuthProvider: No user found in localStorage');
      return false;
    } catch (error) {
      console.error('🔄 AuthProvider: Auth check error:', error);
      return false;
    }
  };

  const login = useCallback(() => {
    console.log('🔐 AuthContext: login() called', { isAuthDisabled, isMounted: true });
    
    // If auth is disabled, go directly to dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Direct access to dashboard');
      router.push('/');
      return;
    }
    
    console.log('🔐 AuthContext: Redirecting to login page');
    router.push('/login');
  }, [isAuthDisabled, router]);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    
    // If auth is disabled, stay on dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Logout ignored');
      return;
    }
    
    router.push('/login');
  }, [isAuthDisabled, router]);

  useEffect(() => {
    console.log('🔄 AuthProvider: Auth useEffect running');
    let isMounted = true;
    let initTimeout: NodeJS.Timeout | null = null;
    
    const initAuth = async () => {
      console.log('🔄 AuthProvider: initAuth called', { isMounted });
      if (!isMounted) {
        console.log('🔄 AuthProvider: initAuth skipped - not mounted');
        return;
      }
      
      try {
        console.log('🔄 AuthProvider: Setting loading to true');
        setIsLoading(true);
        
        // Add a small delay to ensure consistent state initialization
        await new Promise(resolve => {
          initTimeout = setTimeout(resolve, 100);
        });
        
        if (!isMounted) {
          console.log('🔄 AuthProvider: initAuth cancelled - not mounted');
          return;
        }
        
        const isAuthenticated = await checkAuth();
        console.log('🔄 AuthProvider: checkAuth result:', isAuthenticated);
        
        if (isMounted) {
          console.log('🔄 AuthProvider: Setting loading to false');
          setIsLoading(false);
        } else {
          console.log('🔄 AuthProvider: Skipping setLoading(false) - not mounted');
        }
      } catch (error) {
        console.error('🔄 AuthProvider: initAuth error:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    
    return () => {
      console.log('🔄 AuthProvider: Auth useEffect cleanup - setting isMounted to false');
      isMounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []);

  // Memoize isAuthenticated to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => {
    const result = isAuthDisabled ? true : !!user;
    console.log('🔄 AuthProvider: isAuthenticated computed:', { isAuthDisabled, hasUser: !!user, result });
    return result;
  }, [isAuthDisabled, user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
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
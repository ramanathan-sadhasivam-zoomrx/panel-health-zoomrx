"use client";

import React, { createContext, useContext, useCallback, useEffect, useReducer, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user: string;
  email: string;
  name: string;
  accessToken: string;
  idToken: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

type AuthAction =
  | { type: 'INITIALIZE_START' }
  | { type: 'INITIALIZE_SUCCESS'; user: User | null }
  | { type: 'INITIALIZE_ERROR' }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INITIALIZE_START':
      return { ...state, isLoading: true };
    case 'INITIALIZE_SUCCESS':
      return { user: action.user, isLoading: false, isInitialized: true };
    case 'INITIALIZE_ERROR':
      return { ...state, isLoading: false, isInitialized: true };
    case 'LOGOUT':
      return { ...state, user: null };
    default:
      return state;
  }
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
  
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
    isInitialized: false
  });

  const router = useRouter();
  const isNavigating = useRef(false);

  // Check if authentication is disabled for development
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  const safeNavigate = useCallback((path: string) => {
    if (isNavigating.current) {
      console.log('🚫 Navigation already in progress, skipping...');
      return;
    }
    isNavigating.current = true;
    try {
      router.replace(path);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Reset after a short delay to prevent rapid navigation attempts
      setTimeout(() => {
        isNavigating.current = false;
      }, 100);
    }
  }, [router]);

  const checkAuth = async (): Promise<boolean> => {
    console.log('🔄 AuthProvider: checkAuth called');
    try {
      // If auth is disabled, always return true (authenticated)
      if (isAuthDisabled) {
        console.log('🔧 Development mode: Authentication disabled');
        const devUser = {
          user: 'Development User',
          email: 'dev@zoomrx.com',
          name: 'Development User',
          accessToken: 'dev-token',
          idToken: 'dev-id-token'
        };
        dispatch({ type: 'INITIALIZE_SUCCESS', user: devUser });
        return true;
      }

      // Check if localStorage is available (client-side only)
      if (typeof window === 'undefined' || !window.localStorage) {
        console.log('🔄 AuthProvider: localStorage not available (SSR)');
        dispatch({ type: 'INITIALIZE_ERROR' });
        return false;
      }

      // Check if user exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        dispatch({ type: 'INITIALIZE_SUCCESS', user: userData });
        return true;
      }
      dispatch({ type: 'INITIALIZE_SUCCESS', user: null });
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'INITIALIZE_ERROR' });
      return false;
    }
  };

  const login = useCallback(() => {
    // If auth is disabled, go directly to dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Direct access to dashboard');
      safeNavigate('/');
      return;
    }
    safeNavigate('/login');
  }, [isAuthDisabled, safeNavigate]);

  const logout = useCallback(() => {
    // Check if localStorage is available (client-side only)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('user');
    }
    dispatch({ type: 'LOGOUT' });
    
    // If auth is disabled, stay on dashboard
    if (isAuthDisabled) {
      console.log('🔧 Development mode: Logout ignored');
      return;
    }
    
    safeNavigate('/login');
  }, [isAuthDisabled, safeNavigate]);

  useEffect(() => {
    console.log('🔄 AuthProvider: Auth useEffect running');
    let isMounted = true;
    
    const initAuth = async () => {
      console.log('🔄 AuthProvider: initAuth called', { isMounted });
      if (!isMounted) {
        console.log('🔄 AuthProvider: initAuth skipped - not mounted');
        return;
      }
      
      try {
        console.log('🔄 AuthProvider: Setting loading to true');
        dispatch({ type: 'INITIALIZE_START' });
        await checkAuth();
      } catch (error) {
        console.error('🔄 AuthProvider: Error during authentication initialization:', error);
        if (isMounted) {
          dispatch({ type: 'INITIALIZE_ERROR' });
        }
      }
    };

    initAuth();
    
    return () => {
      console.log('🔄 AuthProvider: Auth useEffect cleanup - setting isMounted to false');
      isMounted = false;
    };
  }, []);

  const value: AuthContextType = {
    user: state.user,
    isLoading: state.isLoading || !state.isInitialized,
    isAuthenticated: isAuthDisabled ? true : !!state.user,
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
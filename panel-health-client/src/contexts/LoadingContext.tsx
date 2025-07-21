"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingTracker: string | null;
}

type LoadingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TRACKER'; payload: string | null };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TRACKER':
      return { ...state, loadingTracker: action.payload };
    default:
      return state;
  }
}

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingTracker: string | null;
  setLoadingTracker: (tracker: string | null) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, {
    isLoading: false,
    loadingTracker: null
  });

  const setIsLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setLoadingTracker = (tracker: string | null) => {
    dispatch({ type: 'SET_TRACKER', payload: tracker });
  };

  return (
    <LoadingContext.Provider value={{
      isLoading: state.isLoading,
      setIsLoading,
      loadingTracker: state.loadingTracker,
      setLoadingTracker
    }}>
      {children}
    </LoadingContext.Provider>
  );
}; 
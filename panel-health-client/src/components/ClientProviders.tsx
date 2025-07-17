'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from './AuthProvider';
import { LoadingProvider } from '@/contexts/LoadingContext';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </LoadingProvider>
  );
} 
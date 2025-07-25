"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Retrieve debug info from sessionStorage
        const debugInfo = sessionStorage.getItem('oauthDebug');
        console.log('🔍 Previous OAuth Debug Info:', debugInfo ? JSON.parse(debugInfo) : 'None');
        console.log('🔍 URL Search Params:', {
          code: searchParams.get('code') ? 'Present' : 'Missing',
          error: searchParams.get('error'),
          errorDescription: searchParams.get('error_description'),
          state: searchParams.get('state'),
          sessionState: searchParams.get('session_state')
        });
        
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('❌ OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received');
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }
        // Get the code verifier from sessionStorage
        const codeVerifier = sessionStorage.getItem('codeVerifier');
        
        console.log('🔍 SessionStorage Debug:', {
          hasCodeVerifier: !!codeVerifier,
          codeVerifierLength: codeVerifier ? codeVerifier.length : 0,
          sessionStorageKeys: Object.keys(sessionStorage),
          sessionStorageLength: sessionStorage.length
        });
        
        console.log('🔍 API Configuration:', {
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          hasApiBaseUrl: !!process.env.NEXT_PUBLIC_API_BASE_URL,
          normalizedBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3003'
        });
        
        if (!codeVerifier) {
          console.error('❌ No code verifier found in sessionStorage');
          setStatus('error');
          setMessage('No code verifier found in session');
          return;
        }
        // Fix double /api issue by normalizing the URL
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3003';
        const apiUrl = `${baseUrl}/api/auth/microsoft/callback`;
        const requestBody = {
          code,
          codeVerifier
        };
        
        console.log('🔍 FRONTEND: API Request Details:', {
          url: apiUrl,
          method: 'POST',
          hasCode: !!code,
          codeLength: code ? code.length : 0,
          codeStart: code ? code.substring(0, 20) + '...' : 'none',
          hasCodeVerifier: !!codeVerifier,
          codeVerifierLength: codeVerifier ? codeVerifier.length : 0,
          codeVerifierStart: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'none',
          requestBodyKeys: Object.keys(requestBody),
          baseUrl,
          envApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
        });
        
        // Exchange code for tokens via backend
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📡 FRONTEND: API Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'set-cookie': response.headers.get('set-cookie') ? 'Present' : 'Missing'
          }
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('❌ FRONTEND: API call failed:', data);
          console.error('🔍 FRONTEND: Error details:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            fullData: data
          });
          throw new Error(data.error || 'Authentication failed');
        }

        if (data.success) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Clear the code verifier from sessionStorage
          sessionStorage.removeItem('codeVerifier');
          // Store user info in localStorage
          localStorage.setItem('user', JSON.stringify(data.user));
          // Update auth context
          await checkAuth();
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          console.error('❌ Authentication failed:', data);
          throw new Error(data.error || 'Authentication failed');
        }

      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Authenticating...
                </h2>
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Success!
                </h2>
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Authentication Failed
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <div className="text-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading...
                </h2>
                <p className="text-gray-600">Initializing authentication...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
} 
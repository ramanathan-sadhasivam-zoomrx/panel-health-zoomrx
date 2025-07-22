"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Generate PKCE code verifier and challenge
async function generatePKCE() {
  try {
    // Generate code verifier
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode.apply(null, [...array]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 128);

    // Generate code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashString = hashArray.map(b => String.fromCharCode(b)).join('');
    const codeChallenge = btoa(hashString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { codeVerifier, codeChallenge };
  } catch (error) {
    console.error('Error generating PKCE:', error);
    throw new Error('Failed to generate PKCE values');
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
      
      // Get the current hostname for the redirect URI
      const hostname = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUri = `${hostname}/auth/callback`;

      // Debug: Log environment variables
      console.log('🔍 OAuth Environment Variables:', {
        tenantId: tenantId ? 'Set' : 'Missing',
        clientId: clientId ? 'Set' : 'Missing',
        redirectUri,
        hostname,
        isStaging: hostname.includes('zoomrx.dev'),
        envRedirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI
      });

      if (!tenantId || !clientId) {
        throw new Error('OAuth configuration is missing. Please check your environment variables.');
      }

      // Generate PKCE values
      console.log('🔐 Generating PKCE values...');
      const { codeVerifier, codeChallenge } = await generatePKCE();
      
      if (!codeVerifier || !codeChallenge) {
        throw new Error('Failed to generate PKCE values');
      }

      // Store debug info and code verifier in sessionStorage
      if (typeof window === 'undefined' || !window.sessionStorage) {
        throw new Error('Session storage is not available');
      }

      // Clear any existing values
      sessionStorage.removeItem('codeVerifier');
      sessionStorage.removeItem('oauthDebug');

      // Store new values
      const debugInfo = {
        timestamp: new Date().toISOString(),
        hasCodeVerifier: !!codeVerifier,
        codeVerifierLength: codeVerifier.length,
        hasCodeChallenge: !!codeChallenge,
        codeChallengeLength: codeChallenge.length
      };
      
      sessionStorage.setItem('oauthDebug', JSON.stringify(debugInfo));
      sessionStorage.setItem('codeVerifier', codeVerifier);
      
      // Verify storage
      const storedVerifier = sessionStorage.getItem('codeVerifier');
      if (!storedVerifier) {
        throw new Error('Failed to store code verifier in session storage');
      }

      console.log('💾 PKCE values stored:', {
        debugInfo,
        storedVerifier: storedVerifier ? 'Present' : 'Missing',
        verifierLength: storedVerifier?.length
      });
      
      // Build authorization URL
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid profile email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&response_mode=query`;
      
      console.log('🚀 Redirecting to Microsoft OAuth:', {
        url: authUrl.substring(0, 100) + '...',
        hasCodeChallenge: !!codeChallenge,
        challengeLength: codeChallenge.length
      });
      
      // Redirect to Microsoft OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initiate login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel Health
          </h1>
          <p className="text-gray-600 text-lg">
            ZoomRx Analytics Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl sm:px-10 border border-gray-100">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 mb-8">
              Sign in to access your analytics dashboard
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mx-auto h-12 w-12 bg-gray-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">Development Mode</p>
                <p className="text-sm text-gray-500 mt-2">OAuth disabled for local development</p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Access Dashboard
                </button>
              </div>
            ) : (
              <button
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span className="text-lg">Connecting to Microsoft...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                    <span className="text-lg">Sign in with Microsoft</span>
                  </div>
                )}
              </button>
            )}
            
            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Secure authentication powered by Microsoft Azure AD
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
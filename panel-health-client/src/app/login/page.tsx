"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = new Uint8Array(hash);
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return { codeVerifier, codeChallenge };
  });
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
      const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 
        (typeof window !== 'undefined' && window.location.hostname.includes('zoomrx.dev') 
          ? 'https://zeus-panelist-health-podb-patch-1-dev-0802230855.zoomrx.dev/auth/callback'
          : 'http://localhost:3000/auth/callback');

      if (!tenantId || !clientId) {
        setError('OAuth configuration is missing. Please check your environment variables.');
        return;
      }

      // Generate PKCE values
      const { codeVerifier, codeChallenge } = await generatePKCE();
      
      // Store code verifier in sessionStorage
      sessionStorage.setItem('codeVerifier', codeVerifier);
      
      // Build authorization URL
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid profile email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;
      
      console.log('Redirecting to Microsoft OAuth:', authUrl);
      
      // Redirect to Microsoft OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to initiate login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Login to ZoomRx NPS Analytics
            </h2>
            <p className="text-gray-600 mb-8">
              Sign in to continue using the application.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting to Microsoft...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  Sign in with Outlook
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
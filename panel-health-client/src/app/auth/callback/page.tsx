"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setError(errorDescription || error);
          setIsLoading(false);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setIsLoading(false);
          return;
        }

        console.log('Processing OAuth callback with code:', code);

        // Get PKCE code verifier from sessionStorage (set during login)
        const codeVerifier = sessionStorage.getItem('codeVerifier');
        
        if (!codeVerifier) {
          throw new Error('No code verifier found. Please try logging in again.');
        }

        // Exchange code for tokens directly (SPA requirement)
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
        const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback';

        if (!tenantId || !clientId) {
          throw new Error('Missing OAuth configuration');
        }

        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
            scope: 'openid profile email'
          })
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error_description || 'Token exchange failed');
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          throw new Error('No access token received');
        }

        // Get user info from Microsoft Graph
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get user information');
        }

        const userInfo = await userResponse.json();
        
        // Store user info in localStorage or sessionStorage
        const user = {
          displayName: userInfo.displayName,
          email: userInfo.mail || userInfo.userPrincipalName,
          userPrincipalName: userInfo.userPrincipalName
        };

        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('accessToken', tokenData.access_token);
        
        // Clear the code verifier
        sessionStorage.removeItem('codeVerifier');

        console.log('Authentication successful:', user);
        
        // Redirect to dashboard
        router.push('/');

      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
} 
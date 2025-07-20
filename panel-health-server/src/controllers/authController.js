const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const database = require('../config/database');

class AuthController {
  // Login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      // Check user credentials (you may need to adjust this based on your user table structure)
      const query = 'SELECT * FROM users WHERE username = ? AND type = 1';
      const users = await database.query(query, [username]);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = users[0];

      // Verify password (assuming password is hashed)
      const isValidPassword = await bcrypt.compare(password, user.password || password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          type: user.type 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            type: user.type
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // In a stateless JWT setup, logout is handled client-side
      // You might want to implement a blacklist for tokens if needed
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  // Verify token
  async verifyToken(req, res) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        data: {
          user: decoded
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  // Generate PKCE code verifier and challenge
  static generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  // Microsoft OAuth login redirect with PKCE
  async microsoftLogin(req, res) {
    try {
      console.log('🚀 BACKEND: Microsoft OAuth login initiated');
      console.log('🔍 BACKEND: Request details:', {
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent']?.substring(0, 100) + '...',
          'origin': req.headers['origin'],
          'referer': req.headers['referer'],
          'host': req.headers['host']
        },
        sessionId: req.sessionID,
        hasSession: !!req.session
      });

      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';
      
      // Validate required environment variables
      if (!tenantId) {
        console.error('❌ BACKEND: Missing TENANT_ID environment variable');
        return res.status(500).json({
          success: false,
          error: 'Missing TENANT_ID configuration'
        });
      }
      
      if (!clientId) {
        console.error('❌ BACKEND: Missing CLIENT_ID environment variable');
        return res.status(500).json({
          success: false,
          error: 'Missing CLIENT_ID configuration'
        });
      }
      
      console.log('🔧 BACKEND: OAuth Configuration:', {
        tenantId: tenantId ? 'Set' : 'Missing',
        clientId: clientId ? 'Set' : 'Missing',
        redirectUri,
        nodeEnv: process.env.NODE_ENV,
        sessionSecret: process.env.SESSION_SECRET ? 'Set' : 'Missing'
      });
      
      // Generate PKCE values
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      
      console.log('🔐 BACKEND: PKCE values generated:', {
        codeVerifierLength: codeVerifier.length,
        codeChallengeLength: codeChallenge.length,
        codeVerifierStart: codeVerifier.substring(0, 10) + '...',
        codeChallengeStart: codeChallenge.substring(0, 10) + '...'
      });
      
      // Store code verifier in session for later use
      req.session.codeVerifier = codeVerifier;
      
      console.log('💾 BACKEND: Code verifier stored in session:', {
        hasCodeVerifier: !!codeVerifier,
        codeVerifierLength: codeVerifier.length,
        sessionId: req.sessionID,
        sessionKeys: Object.keys(req.session || {}),
        sessionData: {
          hasCodeVerifier: !!req.session.codeVerifier,
          codeVerifierLength: req.session.codeVerifier ? req.session.codeVerifier.length : 0
        }
      });
      
      // Use PKCE for security (recommended)
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid profile email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;
      
      // Alternative: Simple OAuth without PKCE (for testing only)
      // const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      //   `client_id=${clientId}` +
      //   `&response_type=code` +
      //   `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      //   `&scope=openid profile email`;
      
      console.log('🌐 BACKEND: Generated auth URL:', {
        fullUrl: authUrl,
        baseUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        params: {
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'openid profile email',
          code_challenge: codeChallenge.substring(0, 20) + '...',
          code_challenge_method: 'S256'
        }
      });
      
      console.log('🚀 BACKEND: Redirecting to Microsoft OAuth...');
      res.redirect(authUrl);
    } catch (error) {
      console.error('❌ BACKEND: Microsoft login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Microsoft login: ' + error.message
      });
    }
  }

  // Microsoft OAuth callback with PKCE
  async microsoftCallback(req, res) {
    try {
      console.log('🔄 BACKEND: OAuth callback received');
      console.log('🔍 BACKEND: Request details:', {
        method: req.method,
        url: req.url,
        fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']?.substring(0, 100) + '...',
          'origin': req.headers['origin'],
          'referer': req.headers['referer'],
          'host': req.headers['host'],
          'cookie': req.headers['cookie'] ? 'Present' : 'Missing'
        },
        sessionId: req.sessionID,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : 'no session'
      });
      
      // Handle both GET (direct callback) and POST (from frontend)
      const code = req.query.code || req.body.code;
      const codeVerifier = req.session?.codeVerifier || req.body.codeVerifier;
      
      console.log('🔍 BACKEND: OAuth callback data:', {
        hasCode: !!code,
        codeLength: code ? code.length : 0,
        codeStart: code ? code.substring(0, 20) + '...' : 'none',
        hasSession: !!req.session,
        sessionId: req.sessionID,
        hasCodeVerifier: !!codeVerifier,
        codeVerifierSource: req.session?.codeVerifier ? 'session' : req.body.codeVerifier ? 'body' : 'none',
        codeVerifierLength: codeVerifier ? codeVerifier.length : 0,
        codeVerifierStart: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'none',
        sessionKeys: req.session ? Object.keys(req.session) : 'no session',
        bodyKeys: req.body ? Object.keys(req.body) : 'no body',
        queryKeys: req.query ? Object.keys(req.query) : 'no query',
        sessionData: req.session ? {
          hasCodeVerifier: !!req.session.codeVerifier,
          codeVerifierLength: req.session.codeVerifier ? req.session.codeVerifier.length : 0
        } : 'no session'
      });
      
      if (!code) {
        console.error('❌ BACKEND: No authorization code received in callback');
        console.error('🔍 BACKEND: Debug info:', {
          query: req.query,
          body: req.body,
          hasQuery: !!req.query,
          hasBody: !!req.body,
          queryKeys: req.query ? Object.keys(req.query) : 'no query',
          bodyKeys: req.body ? Object.keys(req.body) : 'no body'
        });
        return res.status(400).json({ 
          success: false,
          error: 'No authorization code received' 
        });
      }

      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

      console.log('🔧 BACKEND: Callback configuration:', {
        tenantId: tenantId ? 'Set' : 'Missing',
        clientId: clientId ? 'Set' : 'Missing',
        clientSecret: clientSecret ? 'Set' : 'Missing',
        redirectUri,
        hasCodeVerifier: !!codeVerifier,
        nodeEnv: process.env.NODE_ENV
      });

      if (!codeVerifier) {
        console.error('❌ BACKEND: No code verifier found in session or request body');
        console.error('🔍 BACKEND: Session debug:', {
          hasSession: !!req.session,
          sessionId: req.sessionID,
          sessionKeys: req.session ? Object.keys(req.session) : 'no session',
          bodyKeys: req.body ? Object.keys(req.body) : 'no body',
          sessionData: req.session ? {
            hasCodeVerifier: !!req.session.codeVerifier,
            codeVerifierLength: req.session.codeVerifier ? req.session.codeVerifier.length : 0,
            allKeys: Object.keys(req.session)
          } : 'no session',
          cookies: req.headers.cookie ? 'Present' : 'Missing'
        });
        return res.status(400).json({
          success: false,
          error: 'No code verifier found in session or request body'
        });
      }

      if (!tenantId || !clientId) {
        console.error('❌ BACKEND: Missing required OAuth configuration');
        console.error('🔍 BACKEND: Environment check:', {
          tenantId: tenantId ? 'Set' : 'Missing',
          clientId: clientId ? 'Set' : 'Missing',
          clientSecret: clientSecret ? 'Set' : 'Missing',
          redirectUri: redirectUri || 'Not set'
        });
        return res.status(500).json({
          success: false,
          error: 'Missing OAuth configuration'
        });
      }

      console.log('🔄 BACKEND: Exchanging code for tokens...');

      // Exchange code for tokens with PKCE
      const tokenParams = {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email'
      };
      
      // Add code_verifier only if available
      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }
      
      console.log('📡 BACKEND: Token exchange request:', {
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        method: 'POST',
        params: {
          client_id: clientId,
          client_secret: clientSecret ? 'Set' : 'Missing',
          code: code.substring(0, 20) + '...',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email',
          code_verifier: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'Not provided'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const tokenResponse = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, 
        new URLSearchParams(tokenParams), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('✅ BACKEND: Token response received:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        hasAccessToken: !!tokenResponse.data.access_token,
        hasIdToken: !!tokenResponse.data.id_token,
        tokenType: tokenResponse.data.token_type,
        expiresIn: tokenResponse.data.expires_in,
        responseKeys: Object.keys(tokenResponse.data)
      });

      const { access_token, id_token } = tokenResponse.data;

      if (!access_token) {
        console.error('❌ BACKEND: No access token received from Microsoft');
        console.error('🔍 BACKEND: Token response data:', tokenResponse.data);
        return res.status(400).json({ 
          success: false,
          error: 'No access token received' 
        });
      }

      console.log('🔄 BACKEND: Getting user info from Microsoft Graph...');

      // Get user info from Microsoft Graph
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userInfo = userResponse.data;
      console.log('✅ BACKEND: User info received:', {
        status: userResponse.status,
        displayName: userInfo.displayName,
        userPrincipalName: userInfo.userPrincipalName,
        mail: userInfo.mail,
        id: userInfo.id,
        responseKeys: Object.keys(userInfo)
      });

      // Store user info in session
      req.session.user = {
        user: userInfo.displayName || userInfo.userPrincipalName,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName,
        accessToken: access_token,
        idToken: id_token
      };

      // Clear the code verifier from session
      delete req.session.codeVerifier;

      console.log('✅ BACKEND: Authentication successful, user stored in session');
      console.log('💾 BACKEND: Session data after auth:', {
        sessionId: req.sessionID,
        hasUser: !!req.session.user,
        userData: req.session.user ? {
          user: req.session.user.user,
          email: req.session.user.email,
          name: req.session.user.name,
          hasAccessToken: !!req.session.user.accessToken,
          hasIdToken: !!req.session.user.idToken
        } : 'no user',
        sessionKeys: Object.keys(req.session)
      });

      res.json({
        success: true,
        user: req.session.user
      });

    } catch (error) {
      console.error('OAuth callback error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Log specific Microsoft OAuth errors
      if (error.response?.status === 403) {
        console.error('🔒 403 Forbidden - Possible causes:');
        console.error('   - Invalid redirect URI');
        console.error('   - Client ID/Secret mismatch');
        console.error('   - Code verifier mismatch');
        console.error('   - Session/cookie issues');
        console.error('   - CORS/Origin restrictions');
      }
      
      res.status(500).json({
        success: false,
        error: 'Authentication failed: ' + (error.response?.data?.error_description || error.message)
      });
    }
  }
}

module.exports = new AuthController(); 
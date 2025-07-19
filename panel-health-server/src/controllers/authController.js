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
      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';
      
      // Validate required environment variables
      if (!tenantId) {
        console.error('Missing TENANT_ID environment variable');
        return res.status(500).json({
          success: false,
          error: 'Missing TENANT_ID configuration'
        });
      }
      
      if (!clientId) {
        console.error('Missing CLIENT_ID environment variable');
        return res.status(500).json({
          success: false,
          error: 'Missing CLIENT_ID configuration'
        });
      }
      
      console.log('OAuth Configuration:', {
        tenantId: tenantId ? 'Set' : 'Missing',
        clientId: clientId ? 'Set' : 'Missing',
        redirectUri
      });
      
      // Generate PKCE values
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      
      // Store code verifier in session for later use
      req.session.codeVerifier = codeVerifier;
      
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid profile email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;
      
      console.log('Generated auth URL:', authUrl);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Microsoft login error details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Microsoft login: ' + error.message
      });
    }
  }

  // Microsoft OAuth callback with PKCE
  async microsoftCallback(req, res) {
    try {
      const { code } = req.query;
      
      console.log('OAuth callback received:', {
        hasCode: !!code,
        codeLength: code ? code.length : 0,
        hasSession: !!req.session,
        hasCodeVerifier: !!req.session?.codeVerifier
      });
      
      if (!code) {
        console.error('No authorization code received in callback');
        return res.status(400).json({ 
          success: false,
          error: 'No authorization code received' 
        });
      }

      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';
      const codeVerifier = req.session?.codeVerifier;

      console.log('Callback configuration:', {
        tenantId: tenantId ? 'Set' : 'Missing',
        clientId: clientId ? 'Set' : 'Missing',
        redirectUri,
        hasCodeVerifier: !!codeVerifier
      });

      if (!codeVerifier) {
        console.error('No code verifier found in session');
        return res.status(400).json({
          success: false,
          error: 'No code verifier found in session'
        });
      }

      if (!tenantId || !clientId) {
        console.error('Missing required OAuth configuration');
        return res.status(500).json({
          success: false,
          error: 'Missing OAuth configuration'
        });
      }

      console.log('Exchanging code for tokens...');

      // Exchange code for tokens with PKCE
      const tokenResponse = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, 
        new URLSearchParams({
          client_id: clientId,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
          scope: 'openid profile email'
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('Token response received:', {
        hasAccessToken: !!tokenResponse.data.access_token,
        hasIdToken: !!tokenResponse.data.id_token,
        tokenType: tokenResponse.data.token_type
      });

      const { access_token, id_token } = tokenResponse.data;

      if (!access_token) {
        console.error('No access token received from Microsoft');
        return res.status(400).json({ 
          success: false,
          error: 'No access token received' 
        });
      }

      console.log('Getting user info from Microsoft Graph...');

      // Get user info from Microsoft Graph
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userInfo = userResponse.data;
      console.log('User info received:', {
        displayName: userInfo.displayName,
        userPrincipalName: userInfo.userPrincipalName,
        mail: userInfo.mail
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

      console.log('Authentication successful, user stored in session');

      res.json({
        success: true,
        user: req.session.user
      });

    } catch (error) {
      console.error('OAuth callback error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      res.status(500).json({
        success: false,
        error: 'Authentication failed: ' + (error.response?.data?.error_description || error.message)
      });
    }
  }
}

module.exports = new AuthController(); 
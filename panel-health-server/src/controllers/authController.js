const crypto = require('crypto');
const axios = require('axios');

class AuthController {

  // Microsoft OAuth login redirect with PKCE
  async microsoftLogin(req, res) {
    try {

      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const redirectUri = process.env.REDIRECT_URI;

      // Validate required environment variables
      if (!tenantId) {
        return res.status(500).json({
          success: false,
          error: 'Missing TENANT_ID configuration'
        });
      }

      if (!clientId) {
        return res.status(500).json({
          success: false,
          error: 'Missing CLIENT_ID configuration'
        });
      }

      if (!redirectUri) {
        return res.status(500).json({
          success: false,
          error: 'Missing REDIRECT_URI configuration'
        });
      }

      // Generate PKCE values
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

      // Store code verifier in session for later use
      req.session.codeVerifier = codeVerifier;

      // Use PKCE for security 
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid profile email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      console.log('BACKEND: Redirecting to Microsoft OAuth...');
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Microsoft login: ' + error.message
      });
    }
  }

  // Microsoft OAuth callback with PKCE
  async microsoftCallback(req, res) {
    try {
      console.log('BACKEND: OAuth callback received');

      // Handle both GET (direct callback) and POST (from frontend)
      const code = req.query.code || req.body.code;
      const codeVerifier = req.session?.codeVerifier || req.body.codeVerifier;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'No authorization code received'
        });
      }

      const tenantId = process.env.TENANT_ID;
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const redirectUri = process.env.REDIRECT_URI;



      if (!codeVerifier) {
        return res.status(400).json({
          success: false,
          error: 'No code verifier found in session or request body'
        });
      }

      if (!tenantId || !clientId || !redirectUri) {
        return res.status(500).json({
          success: false,
          error: 'Missing OAuth configuration'
        });
      }

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

      const tokenResponse = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams(tokenParams), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
      );



      const { access_token, id_token } = tokenResponse.data;

      if (!access_token) {
        return res.status(400).json({
          success: false,
          error: 'No access token received'
        });
      }

      // Extract user info from ID token instead of calling Microsoft Graph
      let userInfo;
      try {
        // Decode the ID token (it's a JWT)
        const idTokenParts = id_token.split('.');
        if (idTokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString());
          userInfo = {
            displayName: payload.name,
            userPrincipalName: payload.upn,
            mail: payload.email || payload.upn,
            id: payload.oid,
            givenName: payload.given_name,
            familyName: payload.family_name
          };
        } else {
          throw new Error('Invalid ID token format');
        }
      } catch (decodeError) {
        // Fallback: try Microsoft Graph (in case permissions are granted later)
        try {
          const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          });
          userInfo = userResponse.data;
        } catch (graphError) {
          // Create minimal user info from what we have
          userInfo = {
            displayName: 'User',
            userPrincipalName: process.env.DEFAULT_USER_EMAIL || 'user@zoomrx.com',
            mail: process.env.DEFAULT_USER_EMAIL || 'user@zoomrx.com',
            id: 'unknown'
          };
        }
      }

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

      console.log('BACKEND: Authentication successful');

      res.json({
        success: true,
        user: req.session.user
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Authentication failed: ' + (error.response?.data?.error_description || error.message)
      });
    }
  }
}

module.exports = new AuthController(); 
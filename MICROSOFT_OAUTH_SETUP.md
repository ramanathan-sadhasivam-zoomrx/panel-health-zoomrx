# Microsoft OAuth Setup Guide

This guide will help you set up Microsoft OAuth authentication for the Panel Health application.

## Prerequisites

1. A Microsoft Azure account
2. An Azure Active Directory (Azure AD) tenant

## Step 1: Register Application in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `Panel Health ZoomRx`
   - **Supported account types**: Choose based on your needs (usually "Accounts in this organizational directory only")
   - **Redirect URI**: 
     - Type: Web
     - URI: `http://localhost:3003/api/auth/microsoft/callback` (for development)
5. Click **Register**

## Step 2: Configure Application

1. **Copy the Application (client) ID** and **Directory (tenant) ID** from the Overview page
2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Add description: `Panel Health OAuth Secret`
5. Choose expiration (recommend 12 months)
6. Click **Add**
7. **Copy the secret value** (you won't be able to see it again)

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Microsoft OAuth Configuration
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:3003/api/auth/microsoft/callback

# Session Configuration
SESSION_SECRET=your-session-secret-here
```

For the frontend, add these to your `.env.local`:

```env
NEXT_PUBLIC_TENANT_ID=your-tenant-id
NEXT_PUBLIC_CLIENT_ID=your-client-id
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Step 4: Install Dependencies

```bash
# Backend dependencies
npm install express-session passport passport-azure-ad axios

# Frontend dependencies (if needed)
npm install
```

## Step 5: OAuth Flow Explanation

1. **User clicks "Sign in with Microsoft"**
2. **Frontend** generates PKCE code verifier/challenge
3. **Backend** generates Microsoft OAuth URL
4. **User** is redirected to Microsoft login
5. **Microsoft** redirects back to `/api/auth/callback` with code
6. **Backend** exchanges code for tokens using PKCE
7. **Backend** gets user info from Microsoft Graph
8. **User** is authenticated and session is created

## Step 6: Testing OAuth

1. Start your backend server: `npm run dev`
2. Start your frontend: `npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Click "Sign in with Microsoft"
5. Complete Microsoft login
6. You should be redirected back and authenticated

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Check redirect URI in Azure app registration
   - Ensure it matches exactly (including protocol and port)

2. **"Missing OAuth configuration"**
   - Check environment variables are set correctly
   - Restart server after changing environment variables

3. **"No access token received"**
   - Check client secret is correct
   - Regenerate client secret in Azure portal

4. **CORS issues**
   - Ensure CORS is configured for your frontend domain
   - Check credentials are enabled in CORS config

### Debug Steps:

1. Check browser console for errors
2. Check server logs for OAuth flow details
3. Verify environment variables are loaded
4. Test OAuth endpoints directly:

```bash
# Test OAuth URL generation
curl http://localhost:3003/api/auth/microsoft

# Check if callback endpoint exists
curl -X POST http://localhost:3003/api/auth/microsoft/callback
```

## Production Deployment

For production, update the redirect URIs:

1. In Azure Portal, add production redirect URI:
   - `https://yourdomain.com/auth/callback`

2. Update environment variables:
   ```env
   REDIRECT_URI=https://yourdomain.com/auth/callback
   NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/auth/callback
   ```

3. Enable secure cookies in production:
   ```javascript
   cookie: {
     secure: true, // Enable for HTTPS
     httpOnly: true,
     maxAge: 24 * 60 * 60 * 1000
   }
   ```

## Security Considerations

1. **Client Secret**: Keep it secure and rotate regularly
2. **Session Secret**: Use a strong, random session secret
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Store tokens securely (server-side sessions)
5. **Scope**: Only request necessary scopes (`openid profile email`)

## API Endpoints

- `GET /api/auth/microsoft` - Initiate OAuth login
- `GET /api/auth/microsoft/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify authentication status

Your Panel Health ZoomRx application now has Microsoft OAuth authentication integrated. Users can sign in with their Microsoft accounts, and all API endpoints are protected.

## Need Help?

- Check the troubleshooting section above
- Review Azure AD documentation
- Check server logs for detailed error messages
- Verify all environment variables are set correctly

**Need Help?** Check the troubleshooting section or review the Azure AD documentation for more details. 
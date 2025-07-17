# Microsoft OAuth Setup Guide

This guide will help you set up Microsoft OAuth authentication for the Panel Health application.

## Prerequisites

1. A Microsoft Azure account
2. An Azure Active Directory (Azure AD) tenant
3. Node.js and npm installed

## Step 1: Register Application in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Panel Health App
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `http://localhost:3000/auth/callback`
5. Click **Register**

## Step 2: Configure Application

1. From the app registration page, note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Add a description and select expiration
5. Copy the **Value** (this is your client secret)

## Step 3: Configure Redirect URIs

1. Go to **Authentication**
2. Under **Platform configurations**, click **Add a platform**
3. Select **Web**
4. Add the following redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3003/api/auth/microsoft/callback`

## Step 4: Set Environment Variables

Create a `.env` file in the `panel-health-server` directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=3306

# Server Configuration
PORT=3003
NODE_ENV=development
SESSION_SECRET=your-session-secret-key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Microsoft OAuth Configuration
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Development Settings
DEV_BYPASS_AUTH=false
```

Replace the following values:
- `your-tenant-id`: Your Azure AD tenant ID
- `your-client-id`: Your application client ID
- `your-client-secret`: Your client secret value
- `your-session-secret-key`: A random string for session encryption
- `your-jwt-secret-key`: A random string for JWT token signing

## Step 5: Start the Application

1. Start the backend server:
   ```bash
   cd panel-health-server
   npm start
   ```

2. Start the frontend:
   ```bash
   cd panel-health-client
   npm run dev
   ```

3. Navigate to `http://localhost:3000`

## Authentication Flow

1. User visits the application
2. If not authenticated, redirected to `/login`
3. User clicks "Sign in with Outlook"
4. Redirected to Microsoft OAuth
5. User authenticates with Microsoft
6. Microsoft redirects back to `/auth/callback`
7. Backend exchanges code for tokens
8. User is redirected to the main application

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Ensure the redirect URI in Azure AD matches exactly
   - Check for trailing slashes or protocol mismatches

2. **"Client secret expired" error**
   - Generate a new client secret in Azure AD
   - Update the `CLIENT_SECRET` in your `.env` file

3. **CORS errors**
   - Ensure `CORS_ORIGIN` is set correctly
   - Check that frontend and backend ports match

4. **Session not persisting**
   - Verify `SESSION_SECRET` is set
   - Check that cookies are enabled in the browser

### Development Mode

For development without OAuth, you can set:
```env
DEV_BYPASS_AUTH=true
```

This will bypass authentication and allow direct access to the application.

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique secrets for production
- Regularly rotate client secrets
- Use HTTPS in production
- Implement proper session management
- Consider implementing token refresh logic 
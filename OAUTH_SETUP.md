# Microsoft OAuth Integration Setup Guide

This guide explains how to set up Microsoft OAuth authentication for the Panel Health ZoomRx application.

## 🔧 **Prerequisites**

1. **Microsoft Azure Account** with admin access
2. **Azure Active Directory (Azure AD)** or **Microsoft 365** subscription
3. **Node.js** application running on a domain (localhost works for development)

## 📋 **Step 1: Azure App Registration**

### 1.1 Create App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `Panel Health ZoomRx`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: 
     - **Type**: `Web`
     - **URI**: `http://localhost:3003/api/auth/callback` (for development)
     - **URI**: `https://your-domain.com/api/auth/callback` (for production)

### 1.2 Get Application Credentials
After registration, note down:
- **Application (client) ID** → `CLIENT_ID`
- **Directory (tenant) ID** → `TENANT_ID`

### 1.3 Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Panel Health OAuth Secret`
4. Choose expiration (recommend 12 months)
5. Copy the **Value** → `CLIENT_SECRET`

## 🔧 **Step 2: Configure Environment Variables**

### 2.1 Backend Configuration
Update `panel-health-server/.env`:

```env
# Microsoft OAuth Configuration
TENANT_ID=your-tenant-id-here
CLIENT_ID=your-client-id-here
CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=http://localhost:3003/api/auth/callback

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Other existing configs...
PORT=3003
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zoomrx_nps
DB_USERNAME=root
DB_PASSWORD=
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=http://localhost:3000
```

### 2.2 Frontend Configuration
Create `panel-health-client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api
```

## 🚀 **Step 3: Install Dependencies**

### 3.1 Backend Dependencies
```bash
cd panel-health-server
npm install express-session passport passport-azure-ad axios
```

### 3.2 Frontend Dependencies
```bash
cd panel-health-client
npm install
```

## 🔄 **Step 4: OAuth Flow Explanation**

### 4.1 Authentication Flow
1. **User clicks "Sign in with Microsoft"**
2. **Frontend** calls `/api/auth/auth-url`
3. **Backend** generates Microsoft OAuth URL
4. **User** is redirected to Microsoft login
5. **Microsoft** redirects back to `/api/auth/callback` with code
6. **Backend** exchanges code for tokens
7. **Backend** gets user info from Microsoft Graph
8. **Backend** creates session and JWT token
9. **Frontend** receives user data and token

### 4.2 Session Management
- **Session-based auth** for web interface
- **JWT tokens** for API access
- **Automatic token refresh** handled by Microsoft

## 🛡️ **Step 5: Security Features**

### 5.1 Route Protection
```javascript
// Protected routes require authentication
app.use('/api/nps', requireAuth, npsRoutes);
app.use('/api/surveys', requireAuth, surveyRoutes);

// Public routes
app.use('/api/auth', authRoutes);
app.get('/health', (req, res) => { ... });
```

### 5.2 Role-Based Access
```javascript
// Check user roles/permissions
const requireRole = (role) => {
  return (req, res, next) => {
    const user = req.session.user.user;
    
    // Check job title
    if (user.jobTitle && user.jobTitle.toLowerCase().includes('admin')) {
      return next();
    }
    
    // Check email domain
    if (user.userPrincipalName && user.userPrincipalName.includes('@zoomrx.com')) {
      return next();
    }
    
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};
```

## 🔧 **Step 6: Testing OAuth**

### 6.1 Start Applications
```bash
# Terminal 1 - Backend
cd panel-health-server
npm run dev

# Terminal 2 - Frontend
cd panel-health-client
npm run dev
```

### 6.2 Test Authentication
1. Open `http://localhost:3000`
2. Click "Sign in with Microsoft"
3. Complete Microsoft login
4. Verify you're redirected back to dashboard
5. Check user info in header dropdown

### 6.3 Test API Protection
```bash
# Without auth (should fail)
curl http://localhost:3003/api/nps

# With session cookie (should work)
curl -b "connect.sid=your-session-id" http://localhost:3003/api/nps
```

## 🌐 **Step 7: Production Deployment**

### 7.1 Update Redirect URIs
In Azure Portal, add production redirect URI:
- `https://your-domain.com/api/auth/callback`

### 7.2 Environment Variables
```env
# Production .env
NODE_ENV=production
REDIRECT_URI=https://your-domain.com/api/auth/callback
CORS_ORIGIN=https://your-domain.com
SESSION_SECRET=your-production-session-secret
```

### 7.3 SSL Configuration
```javascript
// In server.js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

## 🔍 **Step 8: Troubleshooting**

### 8.1 Common Issues

#### **"Invalid redirect URI"**
- Check redirect URI in Azure app registration
- Ensure exact match (including protocol and port)

#### **"AADSTS50011" Error**
- Redirect URI mismatch
- Check both Azure portal and environment variables

#### **"AADSTS70002" Error**
- Invalid client secret
- Regenerate client secret in Azure portal

#### **Session not persisting**
- Check session configuration
- Verify cookie settings
- Ensure CORS is configured correctly

### 8.2 Debug Mode
```javascript
// Enable debug logging
const config = {
  // ... other config
  loggingLevel: 'info', // or 'debug' for more details
};
```

### 8.3 Check Logs
```bash
# Backend logs
pm2 logs panel-health-backend

# Frontend logs
pm2 logs panel-health-frontend
```

## 📚 **Step 9: API Reference**

### 9.1 Authentication Endpoints

#### **GET /api/auth/auth-url**
Get Microsoft OAuth URL
```json
{
  "authUrl": "https://login.microsoftonline.com/..."
}
```

#### **GET /api/auth/callback?code=...**
Handle OAuth callback
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "displayName": "User Name",
    "mail": "user@company.com"
  },
  "token": "jwt-token"
}
```

#### **GET /api/auth/check**
Check authentication status
```json
{
  "authenticated": true,
  "user": { ... }
}
```

#### **POST /api/auth/logout**
Logout user
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 9.2 Protected Endpoints
All protected endpoints require authentication:
- `GET /api/nps` - NPS data
- `GET /api/surveys` - Survey data
- `GET /api/test-db` - Database test

## 🔐 **Step 10: Security Best Practices**

### 10.1 Environment Variables
- Never commit secrets to version control
- Use different secrets for development/staging/production
- Rotate client secrets regularly

### 10.2 Session Security
- Use strong session secrets
- Enable secure cookies in production
- Set appropriate session timeouts

### 10.3 CORS Configuration
- Restrict origins to trusted domains
- Enable credentials for cross-origin requests
- Validate all incoming requests

### 10.4 Error Handling
- Don't expose sensitive information in error messages
- Log authentication failures for monitoring
- Implement rate limiting on auth endpoints

## 🎉 **Success!**

Your Panel Health ZoomRx application now has Microsoft OAuth authentication integrated. Users can sign in with their Microsoft accounts, and all API endpoints are protected.

### **Next Steps:**
1. Test the authentication flow
2. Configure user roles and permissions
3. Set up monitoring and logging
4. Deploy to production environment

---

**Need Help?** Check the troubleshooting section or review the Azure AD documentation for more details. 
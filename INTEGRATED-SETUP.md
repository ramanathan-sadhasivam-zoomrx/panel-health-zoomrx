# 🏥 Panel Health Dashboard - Integrated Setup

This guide explains how to run the Panel Health Dashboard with the frontend and backend served from a single port using Express.js.

## 📋 Overview

The integrated setup serves both the React frontend and Express.js API from the same server on port 3003, eliminating the need to run separate development servers.

### Architecture
```
┌─────────────────────────────────────────┐
│  Express.js Server (Port 3003)         │
├─────────────────────────────────────────┤
│  📊 Frontend (React/Next.js)           │
│  ├─ Dashboard UI                       │
│  ├─ Survey Analytics                   │
│  └─ NPS Tracking                       │
├─────────────────────────────────────────┤
│  🔧 Backend API                        │
│  ├─ /api/surveys                       │
│  ├─ /api/nps                          │
│  └─ Database Integration               │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install dependencies for both frontend and backend
npm run install:all
```

### 2. Build the Frontend
```bash
# Build the Next.js frontend for production
npm run build
```

### 3. Start the Integrated Server
```bash
# Start the Express.js server serving both frontend and API
npm start
```

### 4. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:3003
```

## 🛠️ Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install dependencies for both frontend and backend |
| `npm run build` | Build the frontend and integrate with backend |
| `npm start` | Start the integrated server |
| `npm run dev:backend` | Start only the backend in development mode |
| `npm run dev:frontend` | Start only the frontend in development mode |
| `npm run dev:both` | Start both frontend and backend separately |

### Development Modes

#### Integrated Mode (Recommended for Production)
```bash
npm run build  # Build frontend
npm start      # Start integrated server
```
- Single port (3003)
- Production-optimized
- No CORS issues
- Static file serving

#### Separate Development Mode
```bash
npm run dev:both
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3003
- Hot reload for both
- Development optimized

## 📁 File Structure

```
panel-health-zoomrx/
├── package.json                    # Root package.json with scripts
├── build-frontend.js              # Frontend build script
├── panel-health-client/           # React/Next.js frontend
│   ├── src/
│   │   ├── app/                   # Next.js app router
│   │   ├── components/            # React components
│   │   └── lib/api.ts            # API client (uses relative URLs)
│   ├── package.json
│   └── next.config.js            # Next.js configuration
└── panel-health-server/          # Express.js backend
    ├── src/
    │   ├── server.js             # Main server file (serves frontend + API)
    │   ├── routes/               # API routes
    │   ├── controllers/          # Business logic
    │   └── models/               # Data models
    ├── dist/                     # Built frontend files (generated)
    │   ├── index.html           # Main frontend entry point
    │   ├── static/              # Next.js static files
    │   └── public/              # Public assets
    └── package.json
```

## 🔧 Configuration Details

### Frontend Configuration (`panel-health-client/src/lib/api.ts`)
```typescript
// Uses relative URLs to work with integrated server
const API_BASE_URL = '/api';
```

### Backend Configuration (`panel-health-server/src/server.js`)
```javascript
// Serves static files from built frontend
app.use('/static', express.static(staticPath));
app.use('/public', express.static(publicPath));
app.use(express.static(distPath));

// API routes
app.use('/api/surveys', surveyRoutes);
app.use('/api/nps', npsRoutes);

// Fallback to serve frontend for client-side routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});
```

### Next.js Configuration (`panel-health-client/next.config.js`)
```javascript
const nextConfig = {
  output: 'standalone',           // Generate standalone build
  trailingSlash: true,           // Ensure consistent routing
  generateEtags: false,          // Disable ETags for Express serving
};
```

## 🌐 API Endpoints

### Survey Analytics
- `GET /api/surveys` - Get all surveys with experience scores
- `GET /api/surveys/health` - Backend health check
- `GET /api/surveys/:id` - Get specific survey details

### NPS Tracking
- `GET /api/nps/summary` - NPS summary metrics
- `GET /api/nps/time-series` - NPS time series data

### System
- `GET /health` - Server health status

## 🔍 Troubleshooting

### Frontend Not Loading
1. Ensure you've run the build command:
   ```bash
   npm run build
   ```
2. Check that `panel-health-server/dist/` directory exists
3. Verify the server is running on port 3003

### API Errors
1. Check database connection in backend
2. Verify environment variables are set
3. Check server logs for specific errors

### Build Failures
1. Ensure Node.js version >= 16
2. Clear node_modules and reinstall:
   ```bash
   rm -rf */node_modules
   npm run install:all
   ```

## 📊 Performance Benefits

### Integrated Setup Advantages
✅ **Single Port**: No CORS configuration needed  
✅ **Simplified Deployment**: One server to manage  
✅ **Better Performance**: Direct file serving without proxy  
✅ **Production Ready**: Optimized static file serving  
✅ **Easy SSL**: Single certificate for entire application  

### When to Use Separate Servers
- Active frontend development with hot reload
- Different deployment requirements
- Microservices architecture

## 🔐 Security Considerations

- Static files are served directly by Express
- API routes are properly protected
- CORS is configured for development flexibility
- Environment variables for sensitive configuration

## 📈 Monitoring

The integrated server provides:
- Health check endpoints
- API response logging
- Error handling middleware
- Performance metrics

## 🚀 Deployment

For production deployment:
1. Run `npm run build` to create optimized build
2. Set environment variables
3. Start with `npm start`
4. Configure reverse proxy (nginx) if needed
5. Set up SSL certificates

---

**Need Help?** Check the server logs or API endpoints for diagnostic information. 
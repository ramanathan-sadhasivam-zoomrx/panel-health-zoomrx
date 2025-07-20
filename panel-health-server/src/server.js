const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// For production session storage
let sessionStore;
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  // Use database session store for production
  const MySQLStore = require('express-mysql-session')(session);
  sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zoomrx_nps',
    createDatabaseTable: true
  });
  console.log('🔧 Using MySQL session store for production');
} else {
  console.log('🔧 Using MemoryStore for development');
}

// Import routes
const authRoutes = require('./routes/auth');
const npsRoutes = require('./routes/nps');
const surveyRoutes = require('./routes/surveys');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global request logging - log ALL requests including OPTIONS
app.use((req, res, next) => {
  console.log('🌐 INCOMING REQUEST:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin || 'no-origin',
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
    contentType: req.headers['content-type'],
    accessControlRequestMethod: req.headers['access-control-request-method'],
    accessControlRequestHeaders: req.headers['access-control-request-headers'],
    timestamp: new Date().toISOString()
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log('📨 REQUEST:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
    contentType: req.headers['content-type'],
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : 'no body',
    headers: {
      'access-control-request-method': req.headers['access-control-request-method'],
      'access-control-request-headers': req.headers['access-control-request-headers']
    }
  });
  next();
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: true, // Changed to true for better session persistence
  saveUninitialized: true, // Changed to true to ensure session is created
  store: sessionStore, // Use MySQL store in production
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging', // Enable for HTTPS in staging/production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Add sameSite for better security
    domain: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? '.zoomrx.dev' : undefined // Allow subdomain sharing
  }
}));

// CORS configuration - Simple and reliable
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

// Add zoomrx domains to allowed origins
const allAllowedOrigins = [
  ...allowedOrigins,
  'https://zeus-panelist-health-podb-patch-1-dev-0802230855.zoomrx.dev',
  'https://zeus-panelist-health-podb-patch-1-dev-0802230855.zoomrx.com'
];

console.log('🔧 CORS Configuration:', {
  allowedOrigins: allAllowedOrigins,
  nodeEnv: process.env.NODE_ENV
});

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allAllowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowing origin:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Manual CORS middleware - handle everything manually
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all requests
  console.log('🔄 CORS Middleware:', {
    method: req.method,
    url: req.url,
    origin: origin || 'no-origin',
    isOptions: req.method === 'OPTIONS'
  });
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight for:', req.url);
    
    // Check if origin is allowed
    if (!origin || allAllowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ OPTIONS: Allowing origin:', origin);
      
      // Set all CORS headers
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      
      // End the preflight request
      res.status(204).end();
      return;
    } else {
      console.log('🚫 OPTIONS: Blocking origin:', origin);
      res.status(403).end();
      return;
    }
  }
  
  // Handle non-OPTIONS requests
  if (origin && allAllowedOrigins.indexOf(origin) !== -1) {
    console.log('✅ Non-OPTIONS: Allowing origin:', origin);
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    console.log('✅ Non-OPTIONS: No origin (allowing)');
  } else {
    console.log('🚫 Non-OPTIONS: Blocking origin:', origin);
  }
  
  next();
});

// Simple test endpoint - no middleware
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    cors: 'This endpoint has no CORS restrictions'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nps', npsRoutes);
app.use('/api/surveys', surveyRoutes);

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const database = require('./config/database');
    await database.connect();
    const connection = await database.getConnection();
    
    // Test basic table existence
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]));
    
    // Test users_waves table
    const [userWavesCount] = await connection.execute('SELECT COUNT(*) as count FROM users_waves');
    console.log('users_waves count:', userWavesCount[0].count);
    
    // Test waves table
    const [wavesCount] = await connection.execute('SELECT COUNT(*) as count FROM waves');
    console.log('waves count:', wavesCount[0].count);
    
    // Test specific wave
    const [wave] = await connection.execute('SELECT * FROM waves WHERE id = 119114 LIMIT 1');
    console.log('Test wave 119114:', wave);
    
    res.json({
      success: true,
      message: 'Database connection successful',
      tableCount: tables.length,
      userWavesCount: userWavesCount[0].count,
      wavesCount: wavesCount[0].count,
      testWave: wave[0] || null
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// OAuth configuration test endpoint
app.get('/api/auth/config-test', (req, res) => {
  res.json({
    success: true,
    config: {
      tenantId: process.env.TENANT_ID ? 'Set' : 'Missing',
      clientId: process.env.CLIENT_ID ? 'Set' : 'Missing',
      redirectUri: process.env.REDIRECT_URI || 'Not set',
      nodeEnv: process.env.NODE_ENV,
      sessionSecret: process.env.SESSION_SECRET ? 'Set' : 'Missing',
      allowedOrigins: process.env.ALLOWED_ORIGINS || 'Default'
    },
    session: {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      sessionKeys: req.session ? Object.keys(req.session) : 'no session'
    }
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// CORS POST test endpoint
app.post('/api/cors-test', (req, res) => {
  console.log('✅ CORS POST test endpoint hit:', {
    origin: req.headers.origin,
    body: req.body
  });
  res.json({
    success: true,
    message: 'CORS POST is working!',
    origin: req.headers.origin,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Simple OAuth callback test endpoint
app.post('/api/auth/test-callback', (req, res) => {
  console.log('✅ OAuth callback test endpoint hit:', {
    origin: req.headers.origin,
    body: req.body
  });
  res.json({
    success: true,
    message: 'OAuth callback test successful!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ SERVER: Unhandled error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    url: req.url,
    method: req.method,
    headers: {
      'user-agent': req.headers['user-agent']?.substring(0, 100) + '...',
      'origin': req.headers['origin'],
      'referer': req.headers['referer']
    },
    sessionId: req.sessionID,
    hasSession: !!req.session
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
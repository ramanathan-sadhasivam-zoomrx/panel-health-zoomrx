const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const npsRoutes = require('./routes/nps');
const surveyRoutes = require('./routes/surveys');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: true, // Changed to true for better session persistence
  saveUninitialized: true, // Changed to true to ensure session is created
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

const corsOptions = {
  origin: allAllowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
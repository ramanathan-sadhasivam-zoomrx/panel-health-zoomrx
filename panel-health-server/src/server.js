const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const npsRoutes = require('./routes/nps');
const surveyRoutes = require('./routes/surveys');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // Frontend running on port 3000
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
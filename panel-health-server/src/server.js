const express = require('express');
const cors = require('cors');
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
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Preflight handler
app.options('*', cors());

// Routes
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
    const [wave83005] = await connection.execute('SELECT * FROM waves WHERE id = 83005');
    console.log('Wave 83005 exists:', wave83005.length > 0);
    
    connection.release();
    
    res.json({
      success: true,
      tables: tables.map(t => Object.values(t)[0]),
      userWavesCount: userWavesCount[0].count,
      wavesCount: wavesCount[0].count,
      wave83005Exists: wave83005.length > 0
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: error.message });
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
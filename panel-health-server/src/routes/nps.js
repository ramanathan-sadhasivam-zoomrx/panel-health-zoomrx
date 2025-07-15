const express = require('express');
const npsController = require('../controllers/npsController');
// const auth = require('../middleware/auth'); // Temporarily commented out

const router = express.Router();

// Get NPS time series data
router.get('/time-series', npsController.getNPSTimeSeriesData);

// Get NPS summary metrics
router.get('/summary', npsController.getNPSSummaryMetrics);

// Get NPS detailed data
router.get('/detailed', npsController.getNPSDetailedData);

module.exports = router; 
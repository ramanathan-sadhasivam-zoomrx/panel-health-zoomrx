const express = require('express');
const surveyController = require('../controllers/surveyController');
// const auth = require('../middleware/auth'); // Temporarily commented out

const router = express.Router();

// Get all surveys
router.get('/', surveyController.getAllSurveys);

// Get survey by ID
router.get('/:id', surveyController.getSurveyById);

// Get qualitative comments with sentiment analysis
router.get('/:id/comments/sentiment', surveyController.getQualitativeCommentsWithSentiment);

// Get detailed experience score for a survey
router.get('/:id/experience-score', surveyController.getExperienceScore);

// Get survey experience metrics
router.get('/metrics/experience', surveyController.getSurveyExperienceMetrics);

module.exports = router; 
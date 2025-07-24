const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Microsoft OAuth routes
router.get('/microsoft', authController.microsoftLogin);
router.get('/microsoft/callback', authController.microsoftCallback);
router.post('/microsoft/callback', authController.microsoftCallback);

module.exports = router; 
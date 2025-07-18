const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// Verify token
router.get('/verify', authController.verifyToken);

module.exports = router; 
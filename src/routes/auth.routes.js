// This new file defines the public /login route
const router = require('express').Router();
const authController = require('../controllers/auth.controller');

// Maps POST /api/v1/auth/login
router.post('/login', authController.login);

module.exports = router;

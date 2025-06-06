const express = require('express');
const router = express.Router();
const { fetchEventEmails } = require('../controllers/emailController');

// Route to get event emails, protected by auth middleware if needed
router.get('/events', fetchEventEmails);

module.exports = router

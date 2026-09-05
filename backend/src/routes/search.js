const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

// GET /api/search?q=...&type=...&limit=...
router.get('/', authenticate, searchController.globalSearch);

module.exports = router;

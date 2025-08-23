const express = require('express');
const router = express.Router();
const { submitReport } = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/reports
router.post('/', authMiddleware, submitReport);

module.exports = router;

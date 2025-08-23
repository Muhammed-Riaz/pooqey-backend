const express = require('express');
const router = express.Router();
const { addClient, getClients } = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

// Add client
router.post('/', authMiddleware, addClient);

// Get clients
router.get('/', authMiddleware, getClients);

module.exports = router;

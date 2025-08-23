const express = require('express')
const { getNotifications, markAsRead, createNotification , getAdminNotifications } = require('../controllers/notificationController')
const authMiddleware = require('../middleware/authMiddleware')
const authenticatedRule = require('../middleware/authenticatedRule')

const router = express.Router()

// GET all notifications for advertiser
router.get('/', authMiddleware, getNotifications)
router.get('/all', authMiddleware, authenticatedRule('admin'), getAdminNotifications)

// PUT mark as read
router.put('/:id/read', authMiddleware, markAsRead)

// POST new notification (used internally or from events)
router.post('/', createNotification)

module.exports = router




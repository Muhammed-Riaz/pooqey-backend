const Notification = require('../models/Notification')
const User = require('../models/User');


// Get all notifications for advertiser
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id 
    const notifications = await Notification.find({ userId }).sort({ date: -1 })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    )
    if (!notification) return res.status(404).json({ error: 'Notification not found' })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' })
  }
}

// Create a new notification (e.g., after booking, plan expiry, etc.)
const createNotification = async (req, res) => {
  try {
    const { userId, type, message } = req.body
    const newNotification = new Notification({ userId, type, message })
    await newNotification.save()
    res.status(201).json(newNotification)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' })
  }
}


// Send notification to all admins
const notifyAdmins = async ({ type, message }) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin._id,
      type,
      message,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications); // ✅ Correct method
    }
  } catch (err) {
    console.error('Failed to notify admins:', err.message);
  }
};


const getAdminNotifications = async (req, res) => {
  try {
    // Find all admin users
    const admins = await User.find({ role: 'admin' }).select('_id');
    const adminIds = admins.map(admin => admin._id);

    // Find notifications only for admin userIds
    const notifications = await Notification.find({ userId: { $in: adminIds } })
      .sort({ date: -1 });

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admin notifications' });
  }
};


module.exports = {
  getNotifications,
  markAsRead,
  createNotification,
  notifyAdmins,
  getAdminNotifications
}


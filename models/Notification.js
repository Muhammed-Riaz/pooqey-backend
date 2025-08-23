const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdsUser',
    required: true,
  },
  type: {
    type: String,
    enum: ['favorite', 'booking', 'plan-expiry', 'expired', 'client-status', 'new-booking' , 'plan-purchased' , 'new-user'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    index: { expires: '7d' },  
  },
  read: {
    type: Boolean,
    default: false,
  },
})

module.exports = mongoose.model('Notification', notificationSchema)



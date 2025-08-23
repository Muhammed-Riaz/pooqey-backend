const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdsUser', 
    required: true
  },
  roomTitle: String,
  clientName: String,
  status: String,
  building: String,
  whatsapp: String,
  checkIn: Date,
  checkOut: Date,
  paid: String
}, { timestamps: true });

module.exports = mongoose.model('BookingRecords', bookingSchema);

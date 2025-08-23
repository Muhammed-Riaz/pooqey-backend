const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdsUser',
    required: true
  },
  name: { type: String, required: true },
  city: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  contact: { type: String, required: true },
  nationality: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);

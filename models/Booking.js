const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true
  },
  adTitle: {
    type: String,
    required: true
  },

  date: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'upcoming'],
    default: 'occupied',
    index: true
  },
  client: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    whatsapp: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    persons: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  month: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
BookingSchema.index({ ad: 1, date: 1, endDate: 1 });

// Virtual for duration
BookingSchema.virtual('durationNights').get(function() {
  const diffTime = Math.abs(this.endDate - this.date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Booking', BookingSchema);
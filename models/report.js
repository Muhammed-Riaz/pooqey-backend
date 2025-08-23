const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  listingTitle: String,
  reasons: [String],
  description: String,
  reportedAt: { type: Date, default: Date.now },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdsUser' } // Optional
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);

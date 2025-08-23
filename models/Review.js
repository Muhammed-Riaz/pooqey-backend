const mongoose = require('mongoose');


const reviewSchema = new mongoose.Schema({
  ad: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdsUser',
  },
  guestName: {
    type: String,
    trim: true
  },
  guestEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  cleanliness: { type: Number, required: true, min: 1, max: 5 },
  communication: { type: Number, required: true, min: 1, max: 5 },
  checkIn: { type: Number, required: true, min: 1, max: 5 },
  accuracy: { type: Number, required: true, min: 1, max: 5 },
  location: { type: Number, required: true, min: 1, max: 5 },
  value: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true }
}, { timestamps: true });

// Prevent duplicate reviews from the same user
reviewSchema.index({ ad: 1, user: 1 }, { unique: true, sparse: true });


// Static method to get average rating
reviewSchema.statics.getAverageRating = async function(adId) {
  const obj = await this.aggregate([
    { $match: { ad: adId } },
    { $group: { 
      _id: '$ad',
      averageRating: { $avg: '$rating' },
      cleanliness: { $avg: '$cleanliness' },
      communication: { $avg: '$communication' },
      checkIn: { $avg: '$checkIn' },
      accuracy: { $avg: '$accuracy' },
      location: { $avg: '$location' },
      value: { $avg: '$value' }
    }}
  ]);

  try {
    await this.model('Ad').findByIdAndUpdate(adId, {
      averageRating: obj[0]?.averageRating || 0,
      reviewCount: await this.countDocuments({ ad: adId })
    });
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', function() {
  this.constructor.getAverageRating(this.ad);
});

// Call getAverageRating after remove
reviewSchema.post('remove', function() {
  this.constructor.getAverageRating(this.ad);
});



module.exports = mongoose.model('Review', reviewSchema);
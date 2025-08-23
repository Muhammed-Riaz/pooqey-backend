const Review = require('../models/Review');
const Ad = require('../models/Ad');


// exports.getReviews = async (req, res) => {
//   try {
//     const reviews = await Review.find({ ad: req.params.adId })
//       .populate('user', 'fullName profileImage')
//       .sort('-createdAt');

//     const ad = await Ad.findById(req.params.adId);
//     const categories = ['cleanliness', 'communication', 'checkIn', 'accuracy', 'location', 'value'];
//     const categoryRatings = categories.map((key) => {
//       const total = reviews.reduce((sum, r) => sum + (r[key] || 0), 0);
//       const avg = reviews.length ? total / reviews.length : 0;
//       return {
//         label: key.charAt(0).toUpperCase() + key.slice(1),
//         key,
//         rating: parseFloat(avg.toFixed(1))
//       };
//     });

//     res.json({
//       reviews,
//       averageRating: ad.averageRating,
//       reviewCount: ad.reviewCount,
//       categoryRatings
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };


// exports.addReview = async (req, res) => {
//   try {
//     const ad = await Ad.findById(req.params.adId);
//     if (!ad) {
//       return res.status(404).json({ error: 'Ad not found' });
//     }

//     // Check if the user is logged in
//     if (req.user?.id) {
//       const existingReview = await Review.findOne({
//         ad: req.params.adId,
//         user: req.user.id
//       });

//       if (existingReview) {
//         return res.status(400).json({ error: 'You have already reviewed this ad' });
//       }
//     }

//     // If not logged in, validate guest name & email
//     if (!req.user?.id) {
//       if (!req.body.guestName || !req.body.guestEmail) {
//         return res.status(401).json({ error: 'Name and email are required for guest reviews' });
//       }
//     }

//     // Create the review
//     const review = new Review({
//       ad: req.params.adId,
//       user: req.user?.id || null,
//       guestName: req.body.guestName || null,
//       guestEmail: req.body.guestEmail || null,
//       rating: req.body.rating,
//       cleanliness: req.body.cleanliness,
//       communication: req.body.communication,
//       checkIn: req.body.checkIn,
//       accuracy: req.body.accuracy,
//       location: req.body.location,
//       value: req.body.value,
//       comment: req.body.comment
//     });
     
  

//     await review.save(); // First, save the review

// const reviews = await Review.find({ ad: ad._id });
// const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
// ad.averageRating = reviews.length ? totalRating / reviews.length : 0;
// ad.reviewCount = reviews.length;

// ad.reviews = reviews.length;
// await ad.save();


//     // // Increment review count in Ad
//     // ad.reviews = (ad.reviews || 0) + 1;
//     // await ad.save();

//     if (review.user) {
//       await review.populate('user', 'name avatar');
//     }

//     res.status(201).json(review);
//   } catch (err) {
//     console.error(err);
//     if (err.code === 11000) {
//       return res.status(400).json({ error: 'Duplicate review not allowed' });
//     }
//     res.status(500).json({ error: 'Server error' });
//   }
// };

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ ad: req.params.adId })
      .populate('user', 'fullName profileImage')
      .sort('-createdAt')
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const categories = ['cleanliness', 'communication', 'checkIn', 'accuracy', 'location', 'value'];
    const categoryRatings = categories.map((key) => {
      const total = reviews.reduce((sum, r) => sum + (r[key] || 0), 0);
      const avg = reviews.length ? total / reviews.length : 0;
      return {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        rating: parseFloat(avg.toFixed(1))
      };
    });

    res.json({
      reviews: reviews.map(r => ({
        ...r,
        _id: r._id.toString(), // Convert ObjectId to string
        ad: r.ad.toString(),
        user: r.user ? {
          ...r.user,
          _id: r.user._id.toString()
        } : null
      })),
      averageRating: ad.averageRating || 0,
      reviewCount: reviews.length, // Use actual count from query
      categoryRatings
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: err.message 
    });
  }
};

exports.addReview = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // For guest reviews, create a unique identifier
    const guestIdentifier = !req.user?.id ? 
      `${req.body.guestEmail}-${req.params.adId}` : 
      null;

    // Check for existing review
    const existingReview = await Review.findOne({
      $or: [
        { ad: req.params.adId, user: req.user?.id },
        { ad: req.params.adId, guestIdentifier }
      ]
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this ad' });
    }

    // Create the review
    const review = new Review({
      ad: req.params.adId,
      user: req.user?.id || null,
      guestName: req.body.guestName || null,
      guestEmail: req.body.guestEmail || null,
      guestIdentifier, // Add unique identifier for guests
      rating: req.body.rating,
      cleanliness: req.body.cleanliness,
      communication: req.body.communication,
      checkIn: req.body.checkIn,
      accuracy: req.body.accuracy,
      location: req.body.location,
      value: req.body.value,
      comment: req.body.comment
    });

    await review.save();

    // Update ad's stats
    const reviews = await Review.find({ ad: ad._id });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    ad.averageRating = reviews.length ? totalRating / reviews.length : 0;
    ad.reviewCount = reviews.length;
    await ad.save();

    // Prepare response
    const responseReview = review.toObject();
    if (responseReview.user) {
      await Review.populate(responseReview, { path: 'user', select: 'fullName profileImage' });
    }

    res.status(201).json({
      ...responseReview,
      _id: responseReview._id.toString(),
      ad: responseReview.ad.toString(),
      user: responseReview.user ? {
        ...responseReview.user,
        _id: responseReview.user._id.toString()
      } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



exports.addReview = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // Check if the user is logged in
    if (req.user?.id) {
      const existingReview = await Review.findOne({
        ad: req.params.adId,
        user: req.user.id
      });

      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this ad' });
      }
    }

    // If not logged in, validate guest name & email
    if (!req.user?.id) {
      if (!req.body.guestName || !req.body.guestEmail) {
        return res.status(400).json({ error: 'Name and email are required for guest reviews' });
      }
    }

    // Create the review
    const review = new Review({
      ad: req.params.adId,
      user: req.user?.id || null,
      guestName: req.body.guestName || null,
      guestEmail: req.body.guestEmail || null,
      rating: req.body.rating,
      cleanliness: req.body.cleanliness,
      communication: req.body.communication,
      checkIn: req.body.checkIn,
      accuracy: req.body.accuracy,
      location: req.body.location,
      value: req.body.value,
      comment: req.body.comment
    });

    await review.save();

    // Update ad's average rating and review count
    const reviews = await Review.find({ ad: ad._id });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    ad.averageRating = reviews.length ? totalRating / reviews.length : 0;
    ad.reviewCount = reviews.length;
    await ad.save();

    if (review.user) {
      await review.populate('user', 'fullName profileImage');
    }

    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate review not allowed' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};


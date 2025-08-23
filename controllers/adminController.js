// const Ad = require("../models/Ad");
// const User = require("../models/User");
// const Booking = require("../models/Booking");
// const AdPlanPurchase = require("../models/AdPlanPurchase");
// const Billings = require("../models/BillingRecord");
// const Notification = require("../models/Notification");
// // const { startOfDay, startOfWeek, startOfMonth } = require('date-fns');

// exports.getTotalListings = async (req, res) => {
//   try {
//     const { roomType } = req.query;

//     const filter =
//       roomType && roomType !== "All Room Types" ? { roomType } : {};

//     const [listingCount, uniqueRoomTypes] = await Promise.all([
//       Ad.countDocuments(filter),
//       Ad.distinct("roomType"),
//     ]);

//     const roomTypes = ["All Room Types", ...uniqueRoomTypes.filter(Boolean)];

//     const listingsByPlan = await Ad.aggregate([
//       { $match: filter },
//       {
//         $lookup: {
//           from: "plans",
//           localField: "planId",
//           foreignField: "_id",
//           as: "plan",
//         },
//       },
//       {
//         $addFields: {
//           planName: {
//             $cond: {
//               if: { $gt: [{ $size: "$plan" }, 0] },
//               then: { $toLower: { $arrayElemAt: ["$plan.name", 0] } },
//               else: "free",
//             },
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$planName",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const planCounts = {
//       featured: 0,
//       standard: 0,
//       free: 0,
//       premium: 0,
//     };

//     listingsByPlan.forEach((item) => {
//       const planName = item._id;
//       if (planCounts.hasOwnProperty(planName)) {
//         planCounts[planName] = item.count;
//       } else {
//         planCounts.free += item.count;
//       }
//     });

//     res.json({
//       activeCount: listingCount, // same as total since no status filter
//       featuredCount: planCounts.featured,
//       standardCount: planCounts.standard,
//       premiumCount: planCounts.premium,
//       freeCount: planCounts.free,
//       totalListings: listingCount,
//       roomTypes,
//       selectedRoomType: roomType || "All Room Types",
//     });
//   } catch (error) {
//     console.error("Error fetching listings count:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };

// exports.getTotalAdvertisers = async (req, res) => {
//   try {

//      const { city } = req.query;

//     // Get total count of all advertisers
//     const totalAdvertisers = await User.countDocuments({ role: "advertiser" });

//     // Build filter for city-wise count
//     const filter = { role: "advertiser" };
//     if (city && city !== "All Cities") {
//       filter.city = city;
//     }

//     // Get filtered count
//     const filteredCount = await User.countDocuments(filter);

//     // Get unique cities from advertisers with counts
//     const citiesWithCounts = await User.aggregate([
//       { $match: { role: "advertiser" } },
//       {
//         $group: {
//           _id: "$city",
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { count: -1 } },
//     ]);

//     // Format cities data
//     const cities = [
//       "All Cities",
//       ...citiesWithCounts.filter((c) => c._id).map((c) => c._id),
//     ];

//     res.json({
//       totalAdvertisers,
//       filteredAdvertisers: filteredCount,
//       cities,
//       selectedCity: city || "All Cities",
//     });
//   } catch (error) {
//     console.error("Error fetching advertisers count:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };

// exports.getTotalRevenue = async (req, res) => {
//   try {
//     const { period } = req.query;

//     // Create date filters based on period
//     let dateFilter = {};
//     const now = new Date();

//     if (period === 'Today') {
//       const startOfDay = new Date(now.setHours(0, 0, 0, 0));
//       dateFilter = { purchasedAt: { $gte: startOfDay } };
//     } else if (period === 'This Week') {
//       const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
//       startOfWeek.setHours(0, 0, 0, 0);
//       dateFilter = { purchasedAt: { $gte: startOfWeek } };
//     } else if (period === 'This Month') {
//       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//       dateFilter = { purchasedAt: { $gte: startOfMonth } };
//     }
//     // For 'All Time' we don't need any date filter

//     // Get total revenue with optional date filter
//     const result = await Billings.aggregate([
//       { $match: dateFilter },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: "$price" },
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const totalRevenue = result[0]?.totalRevenue || 0;
//     res.json({
//       totalRevenue,
//       period: period || 'All Time'
//     });
//   } catch (error) {
//     console.error("Error fetching revenue:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };

// exports.getTotalBookings = async (req, res) => {
//   try {
//     const { period } = req.query;

//     // Create date filters based on period
//     let dateFilter = {};
//     const now = new Date();

//     if (period === 'Today') {
//       const startOfDay = new Date(now.setHours(0, 0, 0, 0));
//       dateFilter = {
//         date: {
//           $gte: startOfDay,
//           $lte: now
//         }
//       };
//     } else if (period === 'This Week') {
//       const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
//       startOfWeek.setHours(0, 0, 0, 0);
//       dateFilter = {
//         date: {
//           $gte: startOfWeek,
//           $lte: now
//         }
//       };
//     } else if (period === 'This Month') {
//       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//       dateFilter = {
//         date: {
//           $gte: startOfMonth,
//           $lte: now
//         }
//       };
//     }

//     // Get total bookings with optional date filter
//     const count = await Booking.countDocuments(dateFilter);

//     res.json({
//       bookingCount: count,
//       period: period || 'All Time'
//     });
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };


// exports.getAdvertisorInfo = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, sort = '-createdAt', search = '', city = '' } = req.query;

//     const filter = { role: 'advertiser' };

//     if (search) {
//       filter.$or = [
//         { fullName: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } },
//         { company: { $regex: search, $options: 'i' } }
//       ];
//     }

//     if (city) {
//       filter.city = city;
//     }

//     const advertisers = await User.find(filter)
//       .sort(sort)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     const totalAdvertisers = await User.countDocuments(filter);

//     // Add listingsCount and profile type + all necessary fields
//     const advertisersWithCounts = await Promise.all(
//       advertisers.map(async (advertiser) => {
//         const listingsCount = await Ad.countDocuments({ userId: advertiser._id });

//         return {
//           _id: advertiser._id,
//           fullName: advertiser.fullName,
//           email: advertiser.email,
//           phone: advertiser.phone || advertiser.whatsapp || '',   // use either
//           profileImage: advertiser.profileImage || '',
//           agencyName: advertiser.agencyName || advertiser.company || '',
//           city: advertiser.city || '',
//           website: advertiser.website || '',
//           rating: advertiser.rating || '',
//           type: advertiser.type || (advertiser.isVerified ? 'Premium' : 'Basic'),
//           listingsCount
//         };
//       })
//     );

//     res.json({
//       advertisers: advertisersWithCounts,
//       totalAdvertisers,
//       totalPages: Math.ceil(totalAdvertisers / limit),
//       currentPage: parseInt(page)
//     });

//   } catch (error) {
//     console.error("Error fetching advertiser info:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };


// // controllers/adController.js
// exports.getTotalListingsbyAdmin = async (req, res) => {
//   try {
//     const { status, page = 1, limit = 10, startDate, endDate } = req.query;

//     // Build query
//     const query = { isPublished: true };

//     // Status filter
//     if (status) {
//       query.status = status.toLowerCase();
//     }

//     // Date range filter
//     if (startDate && endDate) {
//       query.postedAt = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }

//     // Get paginated listings with plan data populated
//     const listings = await Ad.find(query)
//       .populate('planId', 'name badge')
//       .sort({ postedAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit));

//     // Get total count for pagination
//     const total = await Ad.countDocuments(query);

//     // Transform data for frontend
//     const transformed = listings.map((ad, index) => ({
//       no: (page - 1) * limit + index + 1,
//       roomType: ad.roomType || 'Not specified',
//       title: ad.title || 'No title',
//       listingType: ad.planId?.name || 'Free',
//       status: ad.status.charAt(0).toUpperCase() + ad.status.slice(1),
//       expiry: ad.expiresAt?.toLocaleDateString() || 'N/A',
//       views: ad.viewCount || 0,
//       clicks: ad.clickCount || 0,
//       favorites: ad.favorites || 0,
//       _id: ad._id
//     }));

//     res.json({
//       listings: transformed,
//       total,
//       page: Number(page),
//       pages: Math.ceil(total / limit),
//       limit: Number(limit) // Add this
//     });

//   } catch (error) {
//     console.error('Error fetching listings:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// // Blacklist a listing
// exports.blacklistListing = async (req, res) => {
//   try {
//     const ad = await Ad.findById(req.params.id);

//     if (!ad) {
//       return res.status(404).json({ message: 'Listing not found' });
//     }

//     const updatedAd = await Ad.findByIdAndUpdate(
//       req.params.id,
//       { isBlacklisted: true, status: 'archived' },
//       { new: true }
//     );

//     // Send notification exactly like favorite notification
//     if (ad.userId) {
//       await Notification.create({
//         userId: ad.userId,
//         type: "client-status",
//         message: `Your ad "${ad.title}" has been blacklisted by admin.`,
//       });
//     }

//     res.json({ success: true, ad: updatedAd });
//   } catch (error) {
//     res.status(500).json({ message: 'Error blacklisting listing' });
//   }
// };


// exports.disableListing = async (req, res) => {
//   try {
//     const ad = await Ad.findById(req.params.id);

//     if (!ad) {
//       return res.status(404).json({ message: 'Listing not found' });
//     }

//     const updatedAd = await Ad.findByIdAndUpdate(
//       req.params.id,
//       { status: 'archived' },
//       { new: true }
//     );

//     // Send notification
//     if (ad.userId) {
//       await Notification.create({
//         userId: ad.userId,
//         type: "client-status",
//         message: `Your ad "${ad.title}" has been disabled by admin.`,
//       });
//     }

//     res.json({ success: true, ad: updatedAd });
//   } catch (error) {
//     res.status(500).json({ message: 'Error disabling listing' });
//   }
// };


// exports.reactivateListing = async (req, res) => {
//   try {
//     const ad = await Ad.findById(req.params.id);

//     if (!ad) {
//       return res.status(404).json({ message: 'Listing not found' });
//     }

//     const updatedAd = await Ad.findByIdAndUpdate(
//       req.params.id,
//       {
//         status: 'active',
//       },
//       { new: true }
//     );

//     // Send reactivation notification to advertiser
//     if (ad.userId) {
//       await Notification.create({
//         userId: ad.userId,
//         type: "client-status",
//         message: `Your ad "${ad.title}" has been reactivated and is now live.`,
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Listing reactivated successfully',
//       ad: updatedAd
//     });
//   } catch (error) {
//     console.error('Error reactivating listing:', error);
//     res.status(500).json({ message: 'Error reactivating listing' });
//   }
// };


// exports.deleteListing = async (req, res) => {
//   try {
//     const ad = await Ad.findById(req.params.id);

//     if (!ad) {
//       return res.status(404).json({ message: 'Listing not found' });
//     }

//     await Ad.findByIdAndDelete(req.params.id);

//     // Send notification
//     if (ad.userId) {
//       await Notification.create({
//         userId: ad.userId,
//         type: "client-status",
//         message: `Your ad "${ad.title}" has been deleted by admin.`,
//       });
//     }

//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ message: 'Error deleting listing' });
//   }
// };



// // my listings admin 

// exports.myListings = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const userEmail = req.user.email;
//     const now = new Date();
//     const threeDaysFromNow = new Date(now);
//     threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

//     // 1. Get all ads for the user
//     const ads = await Ad.find({ userId }).populate("planId");

//     // 2. Get all purchases for this user
//     const purchases = await AdPlanPurchase.find({ userId }).populate("planId");

//     // 3. Prepare notifications
//     for (const ad of ads) {
//       if (
//         ad.isPublished &&
//         ad.expiresAt &&
//         ad.expiresAt > now &&
//         ad.expiresAt <= threeDaysFromNow
//       ) {
//         const existing = await Notification.findOne({
//           userId,
//           type: 'plan-expiry',
//           message: { $regex: ad.title },
//           read: false,
//         });

//         if (!existing) {
//           const message = `Your plan for ad "${ad.title}" is expiring on ${ad.expiresAt.toDateString()}. Please renew soon.`;
//           await Notification.create({
//             userId,
//             type: 'plan-expiry',
//             message,
//           });

//           // Send email
//           await sendEmail({
//             to: userEmail,
//             subject: `Plan Expiry Reminder for "${ad.title}"`,
//             text: message,
//             html: `<p>${message}</p><p>Please renew your plan to keep your ad active.</p>`,
//           });
//         }
//       }

//       // Expired notification and email
//       if (
//         ad.isPublished &&
//         ad.expiresAt &&
//         ad.expiresAt < now
//       ) {
//         const existing = await Notification.findOne({
//           userId,
//           type: 'expired',
//           message: { $regex: ad.title },
//           read: false,
//         });

//         if (!existing) {
//           const message = `Your plan for ad "${ad.title}" expired on ${ad.expiresAt.toDateString()}. Please renew to keep it active.`;
//           await Notification.create({
//             userId,
//             type: 'expired',
//             message,
//           });

//           // Send email
//           await sendEmail({
//             to: userEmail,
//             subject: `Plan Expired for "${ad.title}"`,
//             text: message,
//             html: `<p>${message}</p><p>Please renew your plan as soon as possible to reactivate your ad.</p>`,
//           });
//         }
//       }
//     }

//     // 4. Combine ads with their purchases and determine dynamic status
//     const adsWithPurchases = ads.map((ad) => {
//       const adPurchases = purchases.filter(
//         (p) => p.adId && p.adId.equals(ad._id)
//       );
//       let updatedStatus = ad.status;

//       if (!ad.isPublished) {
//         updatedStatus = "vacant";
//       } else if (ad.expiresAt && ad.expiresAt < now) {
//         updatedStatus = "expired";
//       }

//       return {
//         ...ad.toObject(),
//         status: updatedStatus,
//         purchases: adPurchases,
//       };
//     });

//     // 5. Calculate statistics
//     const totalAds = adsWithPurchases.length;
//     const vacantAds = adsWithPurchases.filter(
//       (ad) => ad.status === "vacant" || ad.status === "draft"
//     ).length;
//     const rentedAds = adsWithPurchases.filter(
//       (ad) => ad.status === "rented"
//     ).length;
//     const expiredAds = adsWithPurchases.filter(
//       (ad) => ad.status === "expired"
//     ).length;
//     const expiringAds = adsWithPurchases.filter(
//       (ad) =>
//         ad.status === "rented" &&
//         ad.expiresAt > now &&
//         ad.expiresAt <= threeDaysFromNow
//     ).length;

//     const occupancyRate = totalAds > 0 ? (rentedAds / totalAds) * 100 : 0;
//     const totalViews = adsWithPurchases.reduce(
//       (sum, ad) => sum + (ad.viewCount || 0),
//       0
//     );
//     const totalClicks = adsWithPurchases.reduce(
//       (sum, ad) => sum + (ad.clickCount || 0),
//       0
//     );
//     const totalRevenue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);

//     // 6. Categorize ads
//     const categorizedAds = {
//       all: adsWithPurchases,
//       vacant: adsWithPurchases.filter((ad) => ad.status === "vacant"),
//       rented: adsWithPurchases.filter((ad) => ad.status === "rented"),
//       expired: adsWithPurchases.filter((ad) => ad.status === "expired"),
//       expiring: adsWithPurchases.filter(
//         (ad) =>
//           ad.status === "rented" &&
//           ad.expiresAt > now &&
//           ad.expiresAt <= threeDaysFromNow
//       ),
//     };

//     // 7. Send response
//     res.json({
//       stats: {
//         totalAds,
//         vacantAds,
//         rentedAds,
//         expiringAds,
//         expiredAds,
//         occupancyRate: parseFloat(occupancyRate.toFixed(2)),
//         totalViews,
//         totalClicks,
//         totalRevenue,
//         averageRating:
//           totalAds > 0
//             ? parseFloat(
//               (
//                 adsWithPurchases.reduce(
//                   (sum, ad) => sum + (ad.averageRating || 0),
//                   0
//                 ) / totalAds
//               ).toFixed(2)
//             )
//             : 0,
//         totalReviews: adsWithPurchases.reduce(
//           (sum, ad) => sum + (ad.reviews || 0),
//           0
//         ),
//       },
//       ads: categorizedAds,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch user ads" });
//   }
// };


// exports.purchasedPlans = async (req, res) => {
//   try {
//     const plans = await AdPlanPurchase.find()
//       .populate("userId", "email fullName profileImage")
//       .populate("adId", "title postedAt expiresAt")
//       .populate("planId", "name")
//       .sort({ purchasedAt: -1 });

//     // Add status based on expiration date
//     const now = new Date();
//     const plansWithStatus = plans.map(plan => {
//       let status = 'active';
//       if (plan.expiresAt && plan.expiresAt < now) {
//         status = 'expired';
//       }
//       return {
//         ...plan.toObject(),
//         status
//       };
//     });

//     res.json(plansWithStatus);
//   } catch (err) {
//     console.error("Error fetching purchased plans:", err);
//     res.status(500).json({ error: "Failed to get purchased plans" });
//   }
// }


// exports.billingRecords = async (req, res) => {
//   try {
//     const records = await Billings.find()
//       .populate("userId", "email")
//       .populate("adId", "title")
//       .populate("planId", "name")
//       .sort({ purchasedAt: -1 });

//     res.json(records);
//   } catch (err) {
//     console.error("Error fetching billing records:", err);
//     res.status(500).json({ error: "Failed to get billing records" });
//   }
// }



const Ad = require("../models/Ad");
const User = require("../models/User");
const Booking = require("../models/Booking");
const AdPlanPurchase = require("../models/AdPlanPurchase");
const Billings = require("../models/BillingRecord");
const Notification = require("../models/Notification");
const { startOfToday, startOfWeek, startOfMonth } = require('date-fns');
const Joi = require('joi');
const sendEmail = require('../utils/sendEmail');

// Middleware for admin authorization
exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: "Admin access required" });
};

// Input validation schemas
const listingFilterSchema = Joi.object({
  roomType: Joi.string().allow('').optional(),
  status: Joi.string().allow('').optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  startDate: Joi.date().allow('').optional(),
  endDate: Joi.date().allow('').optional()
});

// const advertiserFilterSchema = Joi.object({
//   city: Joi.string().optional(),
//   page: Joi.number().min(1).default(1),
//   limit: Joi.number().min(1).max(100).default(10),
//   search: Joi.string().optional(),
//   sort: Joi.string().valid('createdAt', '-createdAt', 'fullName', '-fullName', 'email', '-email').default('-createdAt')
// });

const advertiserFilterSchema = Joi.object({
  city: Joi.string().allow('').optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sort: Joi.string().allow('').optional(),
  search: Joi.string().allow('').optional()
});



// Helper function for date filtering
const getDateFilter = (period) => {
  const now = new Date();
  switch (period) {
    case 'Today':
      return { $gte: startOfToday() };
    case 'This Week':
      return { $gte: startOfWeek(now, { weekStartsOn: 1 }) };
    case 'This Month':
      return { $gte: startOfMonth(now) };
    default:
      return {};
  }
};

exports.getTotalListings = async (req, res) => {
  try {
    const { roomType } = req.query;

    const filter = roomType && roomType !== "All Room Types" ? { roomType } : {};

    const [listingCount, uniqueRoomTypes, listingsByPlan] = await Promise.all([
      Ad.countDocuments(filter),
      Ad.distinct("roomType"),
      Ad.aggregate([
        { $match: filter },
        { $lookup: { from: "plans", localField: "planId", foreignField: "_id", as: "plan" } },
        {
          $addFields: {
            planName: {
              $ifNull: [
                { $toLower: { $arrayElemAt: ["$plan.name", 0] } },
                "free"
              ]
            }
          }
        },
        { $group: { _id: "$planName", count: { $sum: 1 } } }
      ])
    ]);

    const planCounts = listingsByPlan.reduce((acc, { _id, count }) => {
      const planName = _id in acc ? _id : 'free';
      acc[planName] = (acc[planName] || 0) + count;
      return acc;
    }, { featured: 0, standard: 0, free: 0, premium: 0 });

    res.json({
      activeCount: listingCount,
      ...planCounts,
      totalListings: listingCount,
      roomTypes: ["All Room Types", ...uniqueRoomTypes.filter(Boolean)],
      selectedRoomType: roomType || "All Room Types",
    });
  } catch (error) {
    console.error("Error fetching listings count:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getTotalAdvertisers = async (req, res) => {
  try {
    const { error, value } = advertiserFilterSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { city } = value;
    const filter = { role: "advertiser" };
    if (city && city !== "All Cities") filter.city = city;

    const [totalAdvertisers, filteredAdvertisers, citiesWithCounts] = await Promise.all([
      User.countDocuments({ role: "advertiser" }),
      User.countDocuments(filter),
      User.aggregate([
        { $match: { role: "advertiser", city: { $exists: true, $ne: "" } } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      totalAdvertisers,
      filteredAdvertisers,
      cities: ["All Cities", ...citiesWithCounts.map(c => c._id).filter(Boolean)],
      selectedCity: city || "All Cities",
    });
  } catch (error) {
    console.error("Error fetching advertisers count:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getTotalRevenue = async (req, res) => {
  try {
    const { period = 'All Time' } = req.query;
    const dateFilter = period !== 'All Time' ? { purchasedAt: getDateFilter(period) } : {};

    const result = await Billings.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalRevenue: { $sum: "$price" } } }
    ]);

    res.json({
      totalRevenue: result[0]?.totalRevenue || 0,
      period
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getTotalBookings = async (req, res) => {
  try {
    const { period = 'All Time' } = req.query;
    const dateFilter = period !== 'All Time' ? { date: getDateFilter(period) } : {};

    const count = await Booking.countDocuments(dateFilter);
    res.json({ bookingCount: count, period });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getAdvertisorInfo = async (req, res) => {
  try {
    const { error, value } = advertiserFilterSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { page, limit, sort, search, city } = value;
    const filter = { role: 'advertiser' };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    if (city) filter.city = city;

    const sortField = typeof sort === 'string' && sort.trim() !== '' ? sort : '-createdAt';

    const [advertisers, totalAdvertisers] = await Promise.all([
      User.aggregate([
        { $match: filter },
        {
          $sort: {
            [sortField.startsWith('-') ? sortField.slice(1) : sortField]: sortField.startsWith('-') ? -1 : 1
          }
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "ads",
            localField: "_id",
            foreignField: "userId",
            as: "listings"
          }
        },
        {
          $project: {
            _id: 1,
            fullName: 1,
            email: 1,
            phone: 1,
            whatsapp: 1,
            profileImage: 1,
            agencyName: 1,
            company: 1,
            city: 1,
            website: 1,
            rating: 1,
            isVerified: 1,
            listingsCount: { $size: "$listings" },
            type: {
              $cond: [
                { $ifNull: ["$type", false] },
                "$type",
                { $cond: { if: "$isVerified", then: "Premium", else: "Basic" } }
              ]
            }
          }
        }
      ]),
      User.countDocuments(filter)
    ]);

    res.json({
      advertisers: advertisers.map(adv => ({
        ...adv,
        phone: adv.phone || adv.whatsapp || '',
        agencyName: adv.agencyName || adv.company || ''
      })),
      totalAdvertisers,
      totalPages: Math.ceil(totalAdvertisers / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error fetching advertiser info:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getTotalListingsbyAdmin = async (req, res) => {
  try {
    const { error, value } = listingFilterSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { status, page, limit, startDate, endDate } = value;
    const query = { isPublished: true };

    if (status) query.status = status.toLowerCase();
    if (startDate && endDate) {
      query.postedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [listings, total] = await Promise.all([
      Ad.find(query)
        .populate('planId', 'name badge')
        .sort({ postedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Ad.countDocuments(query)
    ]);

    res.json({
      listings: listings.map((ad, index) => ({
        no: (page - 1) * limit + index + 1,
        roomType: ad.roomType || 'Not specified',
        title: ad.title || 'No title',
        listingType: ad.planId?.name || 'Free',
        status: ad.status.charAt(0).toUpperCase() + ad.status.slice(1),
        expiry: ad.expiresAt?.toLocaleDateString() || 'N/A',
        views: ad.viewCount || 0,
        clicks: ad.clickCount || 0,
        favorites: ad.favorites || 0,
        _id: ad._id
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const handleListingAction = async (req, res, action) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Listing not found' });

    let update, message, notificationType;

    switch (action) {
      case 'blacklist':
        update = { isBlacklisted: true, status: 'archived' };
        message = `Your ad "${ad.title}" has been blacklisted by admin.`;
        notificationType = "client-blacklist";
        break;
      case 'disable':
        update = { status: 'archived' };
        message = `Your ad "${ad.title}" has been disabled by admin.`;
        notificationType = "client-status";
        break;
      case 'reactivate':
        update = { status: 'active' };
        message = `Your ad "${ad.title}" has been reactivated and is now live.`;
        notificationType = "client-status";
        break;
      case 'delete':
        await Ad.findByIdAndDelete(req.params.id);
        message = `Your ad "${ad.title}" has been deleted by admin.`;
        notificationType = "client-status";
        break;
    }

    const updatedAd = action !== 'delete'
      ? await Ad.findByIdAndUpdate(req.params.id, update, { new: true })
      : null;

    if (ad.userId) {
      await Notification.create({
        userId: ad.userId,
        adId: ad._id,
        type: notificationType,
        message,
        read: false
      });
    }

    res.json({
      success: true,
      message: `Listing ${action} successfully`,
      ...(updatedAd && { ad: updatedAd })
    });
  } catch (error) {
    console.error(`Error ${action} listing:`, error);
    res.status(500).json({ message: `Error ${action} listing` });
  }
};

exports.blacklistListing = (req, res) => handleListingAction(req, res, 'blacklist');
exports.disableListing = (req, res) => handleListingAction(req, res, 'disable');
exports.reactivateListing = (req, res) => handleListingAction(req, res, 'reactivate');
exports.deleteListing = (req, res) => handleListingAction(req, res, 'delete');

exports.myListings = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    const [ads, purchases] = await Promise.all([
      Ad.find({ userId }).populate("planId"),
      AdPlanPurchase.find({ userId }).populate("planId")
    ]);

    // Prepare notifications in bulk
    const notificationOperations = [];
    const emailNotifications = [];

    ads.forEach(ad => {
      if (!ad.isPublished || !ad.expiresAt) return;

      const notificationBase = { userId, adId: ad._id, read: false };

      if (ad.expiresAt > now && ad.expiresAt <= threeDaysFromNow) {
        notificationOperations.push({
          updateOne: {
            filter: { ...notificationBase, type: 'plan-expiry' },
            update: {
              $setOnInsert: {
                type: 'plan-expiry',
                message: `Your plan for ad "${ad.title}" is expiring soon.`,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
        emailNotifications.push({
          to: req.user.email,
          subject: `Plan Expiry Reminder for "${ad.title}"`,
          text: `Your plan for ad "${ad.title}" is expiring on ${ad.expiresAt.toDateString()}. Please renew soon.`
        });
      } else if (ad.expiresAt < now) {
        notificationOperations.push({
          updateOne: {
            filter: { ...notificationBase, type: 'expired' },
            update: {
              $setOnInsert: {
                type: 'expired',
                message: `Your plan for ad "${ad.title}" has expired.`,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
        emailNotifications.push({
          to: req.user.email,
          subject: `Plan Expired for "${ad.title}"`,
          text: `Your plan for ad "${ad.title}" expired on ${ad.expiresAt.toDateString()}. Please renew to keep it active.`
        });
      }
    });

    // Execute bulk operations
    if (notificationOperations.length > 0) {
      await Notification.bulkWrite(notificationOperations);
    }

    // Send emails (should be queued in production)
    if (process.env.NODE_ENV !== 'test') {
      emailNotifications.forEach(email => sendEmail(email).catch(console.error));
    }

    // Process ads data
    const adsWithPurchases = ads.map(ad => ({
      ...ad.toObject(),
      status: !ad.isPublished ? "vacant" :
        (ad.expiresAt && ad.expiresAt < now) ? "expired" : ad.status,
      purchases: purchases.filter(p => p.adId?.equals(ad._id))
    }));

    // Calculate statistics
    const stats = adsWithPurchases.reduce((acc, ad) => {
      acc.totalAds++;
      if (ad.status === "vacant" || ad.status === "draft") acc.vacantAds++;
      if (ad.status === "rented") acc.rentedAds++;
      if (ad.status === "expired") acc.expiredAds++;
      if (ad.status === "rented" && ad.expiresAt > now && ad.expiresAt <= threeDaysFromNow) acc.expiringAds++;

      acc.totalViews += ad.viewCount || 0;
      acc.totalClicks += ad.clickCount || 0;
      acc.totalRating += ad.averageRating || 0;
      acc.totalReviews += ad.reviews || 0;

      return acc;
    }, {
      totalAds: 0,
      vacantAds: 0,
      rentedAds: 0,
      expiredAds: 0,
      expiringAds: 0,
      totalViews: 0,
      totalClicks: 0,
      totalRating: 0,
      totalReviews: 0
    });

    res.json({
      stats: {
        ...stats,
        occupancyRate: stats.totalAds > 0 ? parseFloat(((stats.rentedAds / stats.totalAds) * 100).toFixed(2)) : 0,
        averageRating: stats.totalAds > 0 ? parseFloat((stats.totalRating / stats.totalAds).toFixed(2)) : 0,
        totalRevenue: purchases.reduce((sum, p) => sum + (p.price || 0), 0)
      },
      ads: {
        all: adsWithPurchases,
        vacant: adsWithPurchases.filter(ad => ad.status === "vacant"),
        rented: adsWithPurchases.filter(ad => ad.status === "rented"),
        expired: adsWithPurchases.filter(ad => ad.status === "expired"),
        expiring: adsWithPurchases.filter(ad =>
          ad.status === "rented" && ad.expiresAt > now && ad.expiresAt <= threeDaysFromNow
        )
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user ads" });
  }
};

exports.purchasedPlans = async (req, res) => {
  try {
    const now = new Date();
    const plans = await AdPlanPurchase.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "ads",
          localField: "adId",
          foreignField: "_id",
          as: "ad"
        }
      },
      { $unwind: { path: "$ad", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan"
        }
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $sort: { purchasedAt: -1 } },
      {
        $project: {
          "user.email": 1,
          "user.fullName": 1,
          "user.profileImage": 1,
          "ad.title": 1,
          "ad.postedAt": 1,
          "ad.expiresAt": 1,
          "plan.name": 1,
          purchasedAt: 1,
          price: 1,
          status: {
            $cond: {
              if: { $and: ["$expiresAt", { $lt: ["$expiresAt", now] }] },
              then: "expired",
              else: "active"
            }
          }
        }
      }
    ]);

    res.json(plans);
  } catch (err) {
    console.error("Error fetching purchased plans:", err);
    res.status(500).json({ error: "Failed to get purchased plans" });
  }
};

exports.billingRecords = async (req, res) => {
  try {
    const records = await Billings.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "ads",
          localField: "adId",
          foreignField: "_id",
          as: "ad"
        }
      },
      { $unwind: { path: "$ad", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan"
        }
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $sort: { purchasedAt: -1 } },
      {
        $project: {
          "user.email": 1,
          "ad.title": 1,
          "plan.name": 1,
          purchasedAt: 1,
          price: 1
        }
      }
    ]);

    res.json(records);
  } catch (err) {
    console.error("Error fetching billing records:", err);
    res.status(500).json({ error: "Failed to get billing records" });
  }
};

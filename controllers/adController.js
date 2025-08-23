const mongoose = require('mongoose');
const Ad = require("../models/Ad");
const Plan = require("../models/Plan");
const User = require("../models/User");
const AdPlanPurchase = require("../models/AdPlanPurchase");
const Notification = require("../models/Notification");
const { notifyAdmins } = require("./notificationController");
const { organizeAmenities } = require("../utils/amenityHelper");
const fs = require("fs");
const path = require("path");
const sendEmail = require('../utils/sendEmail');


// Optional: Save images to disk
function decodeBase64(base64String, filename) {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 string");

  const buffer = Buffer.from(matches[2], "base64");

  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${filename}`; // Return relative path to save in DB
}

// controllers/adController.js
// controllers/adController.js
exports.renewListing = async (req, res) => {
  try {
    const { adId, daysToExtend } = req.body;

    if (!adId) {
      return res.status(400).json({ message: "adId is required" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    // Update expiry date
    ad.expiresAt = new Date(
      new Date(ad.expiresAt).getTime() + (daysToExtend || 30) * 24 * 60 * 60 * 1000
    );

    await ad.save();
    res.json({ message: "Listing renewed successfully", ad });
  } catch (err) {
    console.error("Renew listing error:", err);
    res.status(500).json({ message: err.message });
  }
};


// Get all ads - public
exports.getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find({}); // Optional: filter only approved ads
    res.json({ ads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

// Get only my ads - protected
exports.getMyAds = async (req, res) => {
  try {
    const ads = await Ad.find({ createdBy: req.user._id });
    res.json({ ads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your ads' });
  }
};

exports.createAd = async (req, res) => {
  try {
    const { title, description, price, referenceId, images = [], ...otherFields } = req.body;
    const userId = req.user._id;
    // Add this check to ensure we process an empty array if amenities are missing
    const groupedAmenities = organizeAmenities(req.body.amenities || []);


    let imagePaths = [];

    if (Array.isArray(images)) {
      imagePaths = images.map((base64, index) => {
        const extension = base64.includes("image/png") ? "png" :
          base64.includes("image/jpeg") ? "jpg" : "bin";
        const filename = `ad-${Date.now()}-${index}.${extension}`;
        return decodeBase64(base64, filename); // Save & get path
      });
    }

    const ad = new Ad({
      userId,
      title,
      description,
      price,
      referenceId,
      images: imagePaths, // ✅ Now this is correct
      ...otherFields,
      amenities: groupedAmenities, // ✅ Now it's assigned
      postedAt: new Date(),
      isActive: true,
    });

    await ad.save();
    res.status(201).json({ message: "Ad posted", ad });
  } catch (err) {
    console.error("Ad creation error:", err);
    res.status(500).json({ error: "Failed to post ad" });
  }
};

// update ad

exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // Find the existing ad
    const existingAd = await Ad.findById(id);
    if (!existingAd) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // Check if the user owns the ad
    if (existingAd.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized to update this ad" });
    }

    // Handle images - combine existing and new (max 5 total)
    let updatedImages = [];

    // 1. Get existing images (if any were kept)
    if (req.body.existingImages && Array.isArray(req.body.existingImages)) {
      updatedImages = [...req.body.existingImages];
    } else {
      // If no existing images were specified, keep all original ones
      updatedImages = [...existingAd.images];
    }

    // 2. Add new images (if any were uploaded)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);

      // Calculate how many new images we can add (max 5 total)
      const availableSlots = 5 - updatedImages.length;
      const imagesToAdd = newImages.slice(0, availableSlots);

      updatedImages = [...updatedImages, ...imagesToAdd];
    }

    // Ensure we don't exceed 5 images
    updatedImages = updatedImages.slice(0, 5);

    // Prepare the update object
    const updateData = {
      ...updates,
      images: updatedImages,
      updatedAt: new Date(),
    };

    // Update the ad
    const updatedAd = await Ad.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ message: "Ad updated successfully", ad: updatedAd });
  } catch (err) {
    console.error("Ad update error:", err);
    res.status(500).json({ error: "Failed to update ad" });
  }
};

// get all ads

exports.getAdsByPlanPriority = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: -1 }); // Premium → Free
    const adsByPlan = [];

    for (let plan of plans) {
      const ads = await Ad.find({
        planId: plan._id,
        isPublished: true,
        status: { $in: ["active", "rented"] },
      })
        .populate("planId")
        .populate("userId")
        .sort({ postedAt: -1 })
        .limit(5000);

      adsByPlan.push({ planName: plan.name, ads });
    }

    res.json({ adsByPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load ads" });
  }
};

exports.getUserAds = async (req, res) => {
  try {
        if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Unauthorized. User not found." });
    }
    const userId = req.user._id;
    const userEmail = req.user.email;
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // 1. Get all ads for the user
    const ads = await Ad.find({ userId }).populate("planId");

    // 2. Get all purchases for this user
    const purchases = await AdPlanPurchase.find({ userId }).populate("planId");

    // 3. Prepare notifications
    for (const ad of ads) {
      if (
        ad.isPublished &&
        ad.expiresAt &&
        ad.expiresAt > now &&
        ad.expiresAt <= threeDaysFromNow
      ) {
        const existing = await Notification.findOne({
          userId,
          type: "plan-expiry",
          message: { $regex: ad.title },
          read: false,
        });

        if (!existing) {
          const message = `Your plan for ad "${ad.title
            }" is expiring on ${ad.expiresAt.toDateString()}. Please renew soon.`;
          await Notification.create({
            userId,
            type: "plan-expiry",
            message,
          });

          const owner = await User.findById(ad.userId);
          const ownerName = owner?.fullName || `User ID: ${ad.userId}`;
          const renewUrl = `${process.env.BASE_URL}/purchase-plans/${ad._id}`;

          await notifyAdmins({
            type: "plan-expiry",
            message: `The plan for ad "${ad.title
              }" (owner: ${ownerName}) is expiring on ${ad.expiresAt.toDateString()}.`,
          });

          // ✉️ Expiring Soon Email
          await sendEmail({
            to: userEmail,
            subject: `⏰ Your Listing is Expiring Soon on ${ad.expiresAt.toDateString()}`,
            html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
      <h2 style="color: #e63946;">Hi ${owner?.fullName || "there"},</h2>

      <p>⏳ Just a quick reminder — your listing "<strong>${ad.title}</strong>" is set to expire on <strong>${ad.expiresAt.toDateString()}</strong>.</p>

      <p>To keep your room visible to renters, you can renew your plan before it ends.</p>

      <p style="margin: 24px 0;">
        <a href="${renewUrl}" 
           style="display: inline-block; background-color: #e63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
           🔁 Renew Now
        </a>
      </p>

      <p>Don’t miss out on more potential leads!</p>
      <p>We’re here to help your room stay in front of the right people.</p>

      <p style="margin-top: 32px;">Cheers,<br/><strong>Team Pooqey</strong></p>
    </div>
  `,
          });

        }
      }

      // Expired notification and email
      if (ad.isPublished && ad.expiresAt && ad.expiresAt < now) {
        const existing = await Notification.findOne({
          userId,
          type: "expired",
          message: { $regex: ad.title },
          read: false,
        });

        if (!existing) {
          const message = `Your plan for ad "${ad.title
            }" expired on ${ad.expiresAt.toDateString()}. Please renew to keep it active.`;
          await Notification.create({
            userId,
            type: "expired",
            message,
          });

          const owner = await User.findById(ad.userId);
          const ownerName = owner?.fullName || `User ID: ${ad.userId}`;
          const renewUrl = `${process.env.BASE_URL}/purchase-plans/${ad._id}`;

          await notifyAdmins({
            type: "expired",
            message: `The plan for ad "${ad.title
              }" (owner: ${ownerName}) expired on ${ad.expiresAt.toDateString()}.`,
          });

          await sendEmail({
            to: userEmail,
            subject: `❌ Your Listing Has Expired – Renew Anytime`,
            html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
      <h2 style="color: #e63946;">Hi ${owner?.fullName || "there"},</h2>

      <p>Your listing "<strong>${ad.title}</strong>" has now expired as of <strong>${ad.expiresAt.toDateString()}</strong> and is no longer visible on <strong>Pooqey</strong>.</p>

      <p>But don’t worry — you can renew it anytime to get back in front of renters.</p>

      <p style="margin: 24px 0;">
        <a href="${renewUrl}" 
           style="display: inline-block; background-color: #e63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
           🔄 Renew Your Listing
        </a>
      </p>

      <p>Let us know if you need any help. We’re here to make your rental journey smooth and successful.</p>

      <p style="margin-top: 32px;">All the best,<br/><strong>Team Pooqey</strong></p>
    </div>
  `,
          });


        }
      }
    }

    // 4. Combine ads with their purchases and determine dynamic status
    const adsWithPurchases = ads.map((ad) => {
      const adPurchases = purchases.filter(
        (p) => p.adId && p.adId.equals(ad._id)
      );
      let updatedStatus = ad.status;

      if (!ad.isPublished) {
        updatedStatus = "vacant";
      } else if (ad.expiresAt && ad.expiresAt < now) {
        updatedStatus = "expired";
      }

      return {
        ...ad.toObject(),
        status: updatedStatus,
        purchases: adPurchases,
      };
    });

    // 5. Calculate statistics
    const totalAds = adsWithPurchases.length;
    const vacantAds = adsWithPurchases.filter(
      (ad) => ad.status === "vacant" || ad.status === "draft"
    ).length;
    const rentedAds = adsWithPurchases.filter(
      (ad) => ad.status === "rented"
    ).length;
    const expiredAds = adsWithPurchases.filter(
      (ad) => ad.status === "expired"
    ).length;
    const expiringAds = adsWithPurchases.filter(
      (ad) =>
        ad.status === "rented" &&
        ad.expiresAt > now &&
        ad.expiresAt <= threeDaysFromNow
    ).length;

    const occupancyRate = totalAds > 0 ? (rentedAds / totalAds) * 100 : 0;
    const totalViews = adsWithPurchases.reduce(
      (sum, ad) => sum + (ad.viewCount || 0),
      0
    );
    const totalClicks = adsWithPurchases.reduce(
      (sum, ad) => sum + (ad.clickCount || 0),
      0
    );
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);

    // 6. Categorize ads
    const categorizedAds = {
      all: adsWithPurchases,
      vacant: adsWithPurchases.filter((ad) => ad.status === "vacant"),
      rented: adsWithPurchases.filter((ad) => ad.status === "rented"),
      expired: adsWithPurchases.filter((ad) => ad.status === "expired"),
      expiring: adsWithPurchases.filter(
        (ad) =>
          ad.status === "rented" &&
          ad.expiresAt > now &&
          ad.expiresAt <= threeDaysFromNow
      ),
    };

    // 7. Send response
    res.json({
      stats: {
        totalAds,
        vacantAds,
        rentedAds,
        expiringAds,
        expiredAds,
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        totalViews,
        totalClicks,
        totalRevenue,
        averageRating:
          totalAds > 0
            ? parseFloat(
              (
                adsWithPurchases.reduce(
                  (sum, ad) => sum + (ad.averageRating || 0),
                  0
                ) / totalAds
              ).toFixed(2)
            )
            : 0,
        totalReviews: adsWithPurchases.reduce(
          (sum, ad) => sum + (ad.reviews || 0),
          0
        ),
      },
      ads: categorizedAds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user ads" });
  }
};

// Add this to your adController.js
exports.markAdsOccupied = async (req, res) => {
  try {
    const { adIds } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!adIds || !Array.isArray(adIds)) {
      return res.status(400).json({ error: "Invalid ad IDs" });
    }

    // Update all selected ads
    const result = await Ad.updateMany(
      {
        _id: { $in: adIds },
        userId, // Ensure user owns these ads
      },
      {
        $set: {
          status: "rented",
          isOccupied: true,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "No eligible ads found or unauthorized" });
    }

    res.json({
      success: true,
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark ads as occupied" });
  }
};

// update ads status

exports.updateAdStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id; // From auth middleware

    // Validate status input
    const validStatuses = ["draft", "active", "rented", "vacant", "expired"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Update the ad (only if user owns it)
    const updatedAd = await Ad.findOneAndUpdate(
      { _id: id, userId },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedAd) {
      return res.status(404).json({ error: "Ad not found or unauthorized" });
    }

    res.json(updatedAd);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ad status" });
  }
};

// delete ad by id

exports.deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.user._id });

    if (!ad) {
      return res.status(404).json({ error: "Ad not found or unauthorized" });
    }

    await Ad.deleteOne({ _id: req.params.id });

    res.json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete ad" });
  }
};

exports.adViews = async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, {
      $inc: { viewCount: 1 },
    });
    res.status(200).send("View counted");
  } catch (error) {
    res.status(500).send("Error tracking view");
  }
};

exports.adClicks = async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, {
      $inc: { clickCount: 1 },
    });
    res.status(200).send("Click counted");
  } catch (error) {
    res.status(500).send("Error tracking click");
  }
};


exports.getSingleAd = async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId before querying
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid ad ID." });
  }

  try {
    const ad = await Ad.findById(id)
      .populate("userId", "fullName email  profileImage createdAt")
      .populate("planId");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    res.json(ad);

  } catch (error) {
    console.error("Error fetching ad:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// add favorite

exports.getUserFavorites = async (req, res) => {
  const userId = req.user._id;

  try {
    const ads = await Ad.find({ favoritesList: userId }).select('_id');
    const favoriteIds = ads.map(ad => ad._id);

    res.json({ favorites: favoriteIds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

// 🔻 REMOVE Favorite
exports.removeFavoriteCount = async (req, res) => {
  console.log("🔥 DELETE /:id/favorite HIT");

  const adId = req.params.id;
  const userId = req.user._id.toString();

  try {
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    if (!ad.favoritesList) ad.favoritesList = [];

    const index = ad.favoritesList.findIndex(id => id.toString() === userId);
    if (index > -1) {
      ad.favoritesList.splice(index, 1);
      ad.favorites = ad.favoritesList.length;
      await ad.save();
    }

    res.json({
      message: 'Removed from Favorite',
      favorited: false,
      favoritesCount: ad.favoritesList.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
};

exports.addFavoriteCount = async (req, res) => {
  const adId = req.params.id;
  const userId = req.user._id.toString();

  try {
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    if (!ad.favoritesList) ad.favoritesList = [];

    const index = ad.favoritesList.findIndex(id => id.toString() === userId);

    let action = '';

    if (index > -1) {
      ad.favoritesList.splice(index, 1);
      action = 'removed';
    } else {
      ad.favoritesList.push(userId);
      action = 'added';
    }

    ad.favorites = ad.favoritesList.length;

    await ad.save();

    res.json({
      message: action === 'added' ? 'Added to Favorite' : 'Removed from Favorite',
      favorited: action === 'added',
      favoritesCount: ad.favoritesList.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
};


// search results

exports.searchRequest = async (req, res) => {
  try {
    const { roomType, rentalType, location } = req.body; // ✅ Extract from request body

 const andConditions = [
      { isPublished: true },
      { status: { $in: ["active", "vacant", "rented"] } },
    ];

    if (roomType) {
      andConditions.push({
        roomType: { $regex: new RegExp(roomType, "i") }
      });
    }

    if (rentalType) {
      andConditions.push({
        rentalType: { $regex: new RegExp(rentalType, "i") }
      });
    }


    if (location) {
      const locationParts = location.split(',').map(part => part.trim());

      andConditions.push({
        $or: [
          { city: { $in: locationParts } },
          { area: { $in: locationParts } }
        ]
      });
    }


    const query = { $and: andConditions };


    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: "adsusers",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          planPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$plan.name", "Premium"] }, then: 1 },
                { case: { $eq: ["$plan.name", "Featured"] }, then: 2 },
                { case: { $eq: ["$plan.name", "Standard"] }, then: 3 },
                { case: { $eq: ["$plan.name", "Free"] }, then: 4 },
              ],
              default: 4,
            },
          },
          priceNumber: {
            $cond: {
              if: { $eq: [{ $type: "$price" }, "string"] },
              then: { $toDouble: "$price" },
              else: "$price",
            },
          },
        },
      },
      { $sort: { planPriority: 1, postedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          priceNumber: 1,
          roomType: 1,
          rentalType: 1,
          whatsapp: 1,
          licenseNumber: 1,
          city: 1,
          price: 1,
          location: 1,
          images: 1,
          postedAt: 1,
          "user.fullName": 1,
          "user.phone": 1,
          "user.profileImage": 1,
          "user.bio": 1,
          "user.company": 1,
          "plan.name": 1,
          "plan.badge": 1,
        },
      },
    ];

    const [results, total] = await Promise.all([
      Ad.aggregate(aggregationPipeline),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: results.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
      error: error.message,
    });
  }
};


exports.searchRequestmob = async (req, res) => {
  try {
    const { roomType, location, rentalType, priceRange } = req.body;

    const andConditions = [
      { isPublished: true },
      { status: { $in: ["active", "vacant", "rented"] } },
    ];

    if (roomType) andConditions.push({ roomType });
    if (rentalType) andConditions.push({ rentalType });

   if (location) {
      const locationParts = location.split(',').map(part => part.trim());

      andConditions.push({
        $or: [
          { city: { $in: locationParts } },
          { area: { $in: locationParts } }
        ]
      });
    
    }

    if (priceRange) {
      const priceConditions = [];

      // Handle price stored as number
      const numericCondition = {
        $and: [
          { price: { $type: "number" } },
          (() => {
            switch (priceRange) {
              case "Below AED 1000":
                return { price: { $lt: 1000 } };
              case "AED 1000 - 2000":
                return { price: { $gte: 1000, $lte: 2000 } };
              case "Above AED 2000":
                return { price: { $gt: 2000 } };
              default:
                return {};
            }
          })(),
        ],
      };
      priceConditions.push(numericCondition);

      // Handle price stored as numeric string (e.g. "600")
      const stringCondition = {
        $and: [
          { price: { $type: "string" } },
          {
            $expr: (() => {
              const priceValue = { $toDouble: "$price" };
              switch (priceRange) {
                case "Below AED 1000":
                  return { $lt: [priceValue, 1000] };
                case "AED 1000 - 2000":
                  return {
                    $and: [
                      { $gte: [priceValue, 1000] },
                      { $lte: [priceValue, 2000] },
                    ],
                  };
                case "Above AED 2000":
                  return { $gt: [priceValue, 2000] };
                default:
                  return {};
              }
            })(),
          },
        ],
      };
      priceConditions.push(stringCondition);

      // Combine both price filters
      andConditions.push({ $or: priceConditions });
    }

    const query = { $and: andConditions };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: "adsusers",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          planPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$plan.name", "Premium"] }, then: 1 },
                { case: { $eq: ["$plan.name", "Featured"] }, then: 2 },
                { case: { $eq: ["$plan.name", "Standard"] }, then: 3 },
                { case: { $eq: ["$plan.name", "Free"] }, then: 4 },
              ],
              default: 4,
            },
          },
          priceNumber: {
            $cond: {
              if: { $eq: [{ $type: "$price" }, "string"] },
              then: { $toDouble: "$price" },
              else: "$price",
            },
          },
        },
      },
      { $sort: { planPriority: 1, postedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          priceNumber: 1,
          roomType: 1,
          rentalType: 1,
          city: 1,
          whatsapp: 1,
          area: 1,
          location: 1,
          images: 1,
          postedAt: 1,
          "user.fullName": 1,
          "user.phone": 1,
          "user.profileImage": 1,
          "user.bio": 1,
          "user.company": 1,
          "plan.name": 1,
          "plan.badge": 1,
        },
      },
    ];

    const [results, total] = await Promise.all([
      Ad.aggregate(aggregationPipeline),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: results.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
      error: error.message,
    });
  }
};





exports.searchExtraRequest = async (req, res) => {
  console.log('Search request body:', req.body);
  try {
    const {
      roomType,
      location, // This should be in "Area, City" format (e.g., "Dubai Marina, Dubai")
      rentalType,
      priceRange,
      amenities,
      neighborhood, // This is the specific neighborhood if selected separately
    } = req.body;

    const amenityCategories = {
      essentials: "essentials",
      bathroom: "bathroom",
      kitchenandDining: "kitchenandDining",
      laundry: "laundry",
      homeFeatures: "homeFeatures",
      safetyandSecurity: "safetyandSecurity",
      cleaningandHousekeeping: "cleaningandHousekeeping",
      recreationAndWellness: "recreationAndWellness",
      accessAndParking: "accessAndParking",
      guestAccessAndRules: "guestAccessAndRules",
    };

    // Initialize match conditions
    const matchConditions = {
      isPublished: true,
      status: { $in: ["active", "vacant", "rented"] },
      $and: [] // Initialize $and array
    };

    // Basic filters
    if (roomType) matchConditions.roomType = roomType;
    if (rentalType) matchConditions.rentalType = rentalType;

    // Location handling - parse "Area, City" format
    if (location) {
      const [areaFromLocation, cityFromLocation] = location.split(',').map(s => s.trim());
      
      // If neighborhood is provided separately, use that for area
      const areaToSearch = neighborhood || areaFromLocation;
      
      if (areaToSearch && cityFromLocation) {
        matchConditions.$and.push({
          $and: [
            { city: cityFromLocation },
            { area: areaToSearch }
          ]
        });
      } else if (areaToSearch) {
        // If only area is provided (no city in location string)
        matchConditions.$and.push({
          area: areaToSearch
        });
      } else if (cityFromLocation) {
        // If only city is provided
        matchConditions.$and.push({
          city: cityFromLocation
        });
      }
    }

    // If neighborhood is provided but no location, use just the neighborhood
    if (neighborhood && !location) {
      matchConditions.$and.push({
        area: neighborhood
      });
    }

    // Remove $and if empty to avoid MongoDB errors
    if (matchConditions.$and.length === 0) {
      delete matchConditions.$and;
    }

    // Price range filtering (keep your existing code)
    if (priceRange) {
      const exprPriceCondition = (() => {
        switch (priceRange) {
          case "Below AED 1000":
            return {
              $lt: [
                {
                  $cond: [
                    { $eq: [{ $type: "$price" }, "string"] },
                    { $toDouble: "$price" },
                    "$price",
                  ],
                },
                1000,
              ],
            };
          case "AED 1000 - 2000":
            return {
              $and: [
                {
                  $gte: [
                    {
                      $cond: [
                        { $eq: [{ $type: "$price" }, "string"] },
                        { $toDouble: "$price" },
                        "$price",
                      ],
                    },
                    1000,
                  ],
                },
                {
                  $lte: [
                    {
                      $cond: [
                        { $eq: [{ $type: "$price" }, "string"] },
                        { $toDouble: "$price" },
                        "$price",
                      ],
                    },
                    2000,
                  ],
                },
              ],
            };
          case "Above AED 2000":
            return {
              $gt: [
                {
                  $cond: [
                    { $eq: [{ $type: "$price" }, "string"] },
                    { $toDouble: "$price" },
                    "$price",
                  ],
                },
                2000,
              ],
            };
          default:
            return null;
        }
      })();

      if (exprPriceCondition) {
        matchConditions.$expr = exprPriceCondition;
      }
    }

    // Amenities match
    if (amenities && amenities.length > 0) {
      matchConditions.$and = matchConditions.$and || [];
      const amenityQueries = Object.values(amenityCategories).map(
        (category) => ({
          [`amenities.${category}`]: { $in: amenities },
        })
      );
      matchConditions.$and.push({ $or: amenityQueries });
    }

    // Pagination and aggregation (keep your existing code)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

        const aggregationPipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "adsusers",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          planPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$plan.name", "Premium"] }, then: 1 },
                { case: { $eq: ["$plan.name", "Featured"] }, then: 2 },
                { case: { $eq: ["$plan.name", "Standard"] }, then: 3 },
                { case: { $eq: ["$plan.name", "Free"] }, then: 4 },
              ],
              default: 4,
            },
          },
          priceNumber: {
            $cond: {
              if: { $eq: [{ $type: "$price" }, "string"] },
              then: { $toDouble: "$price" },
              else: "$price",
            },
          },
        },
      },
      { $sort: { planPriority: 1, postedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          priceNumber: 1,
          roomType: 1,
          rentalType: 1,
          whatsapp: 1,
          city: 1,
          area: 1,
          location: 1,
          images: 1,
          postedAt: 1,
          "user.fullName": 1,
          "user.profileImage": 1,
          "user.bio": 1,
          "plan.name": 1,
          "plan.badge": 1,
        },
      },
    ];


    const [results, total] = await Promise.all([
      Ad.aggregate(aggregationPipeline),
      Ad.countDocuments(matchConditions),
    ]);

    res.json({
      success: true,
      count: results.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
      error: error.message,
    });
  }
};


// const resetExpiredAds = async () => {
//   try {
//     const expiredAds = await Ad.find({
//       expiresAt: { $lt: new Date() },
//       isActive: true,
//     });

//     for (let ad of expiredAds) {
//       ad.isActive = false;

//       // Delete associated images
//       for (const imgPath of ad.images) {
//         const fullPath = path.join(__dirname, "../", imgPath);
//         if (fs.existsSync(fullPath)) {
//           fs.unlinkSync(fullPath);
//         }
//       }

//       await ad.save();
//     }

//     console.log(`${expiredAds.length} expired ads have been reset and images removed.`);
//   } catch (err) {
//     console.error("Error resetting expired ads:", err);
//   }
// };

// resetExpiredAds();

const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  listingId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  price: { type: Number, required: true },
  roomType: String,
  rentalType: String,
  youtubeUrl: String,
  tourUrl: String,
  whatsapp: String,
  preferredTenant: String,
  preferredNationality: String,
  tenantCount: String,
  bathroomType: String,
  petFriendly: String,
  securityDeposit: String,
  amenities: {
    essentials: { type: [String], default: [] },
    bathroom: { type: [String], default: [] },
    kitchenandDining: { type: [String], default: [] },
    laundry: { type: [String], default: [] },
    homeFeatures: { type: [String], default: [] },
    safetyandSecurity: { type: [String], default: [] },
    cleaningandHousekeeping: { type: [String], default: [] },
    recreationAndWellness: { type: [String], default: [] },
    accessAndParking: { type: [String], default: [] },
    guestAccessAndRules: { type: [String], default: [] },
  },

  licenseNumber: String,
  dedNumber: String,
  city: String,
  area: String,

  images: [{ type: String, required: true }],
  availableFrom: Date,
  postOn: Date,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "AdsUser" },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    default: null,
  },
  purchases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdPlanPurchase",
    },
  ],
  status: {
    type: String,
    enum: ["draft", "active", "vacant", "rented", "expired", "archived"],
    default: "draft",
  },
  isPublished: { type: Boolean, default: false },
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  viewCount: { type: Number },
  clickCount: { type: Number },
  favorites: { type: Number, default: 0 },
  favoritesList: [{ type: mongoose.Schema.Types.ObjectId, ref: "AdsUser" }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);

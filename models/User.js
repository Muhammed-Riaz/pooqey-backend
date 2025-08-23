const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: function () {
        return this.authMethod === "local";
      },
    },
    email: { type: String, required: true, unique: true },
    whatsapp: {
      type: String,
      required: function () {
        return this.authMethod === "local";
      },
    },
    company: { type: String },
    role: {
      type: String,
      enum: ["admin", "advertiser", "user"],
      default: "advertiser",
    },
    isVerified: { type: Boolean, default: false },
    terms: { type: Boolean, default: false },
    password: {
      type: String,
      required: function () {
        return this.authMethod === "local";
      },
    },
    profileImage: { type: String, default: "" },
    bio: { type: String, default: "" },
    city: { type: String, default: "" },
    website: { type: String, default: "" },
      socialLinks: [String], // ✅ Important
  advertiserName: String, // ✅ Add this
  agencyName: String,     // ✅ Add this
  licenseNumber: String,  // ✅ Add this
  dedNumber: String,      // ✅ Add this
  rating: String,         // ✅ Add this

    googleId: { type: String, unique: true, sparse: true },
    authMethod: {
      type: String,
      enum: ["local", "google"],
      default: "google",
    },
    socialMedia: {
      google: { type: String, default: "" },
    },
    type: {
  type: String,
  enum: ['Free', 'Basic', 'Premium'],
  default: 'Free'
}

  },
  { timestamps: true }
);

// 🔍 Add this pre-validation hook for debugging
userSchema.pre("validate", function (next) {
  console.log("authMethod during validation:", this.authMethod);
  next();
});

userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("AdsUser", userSchema);

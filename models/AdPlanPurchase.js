const mongoose = require("mongoose");

const adPlanPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "AdsUser", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  price: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AdPlanPurchase", adPlanPurchaseSchema);

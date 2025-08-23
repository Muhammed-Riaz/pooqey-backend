const mongoose = require("mongoose");

const billingRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdsUser",
    required: true,
  },
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ad",
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  planName: String,
  duration: Number,
  price: Number,
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  paymentSessionId: String, // Optional: Stripe session id
});

module.exports = mongoose.model("BillingRecord", billingRecordSchema);

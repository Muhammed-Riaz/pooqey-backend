const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: String,
  price: Number,
  positionText: String,
  duration: Number,
  autoUpdateDays: Number,
  badge: String
}, { timestamps: true });

module.exports = mongoose.model("Plan", planSchema);

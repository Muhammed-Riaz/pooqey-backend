
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const Ad = require("../models/Ad"); 
const mongoose = require("mongoose");

// Connect DB if running standalone
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const resetExpiredAds = async () => {
  try {
    const expiredAds = await Ad.find({
      expiresAt: { $lt: new Date() },
      isActive: true,
    });

    for (let ad of expiredAds) {
      ad.isActive = false;

      // Delete associated images
      for (const imgPath of ad.images) {
        const fullPath = path.join(__dirname, "../", imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      await ad.save();
    }

    console.log(`${expiredAds.length} expired ads deactivated and cleaned.`);
  } catch (err) {
    console.error("Cron error:", err);
  }
};

// Run every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  console.log("Running expired ads cleanup cron job...");
  resetExpiredAds();
});

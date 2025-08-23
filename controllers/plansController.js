// const Plan = require("../models/Plan");
// const AdPlanPurchase = require("../models/AdPlanPurchase");
// const Ad = require("../models/Ad");
// const stripe = require("../config/stripe");
// const sendEmail = require("../utils/sendEmail");
// const User = require("../models/User");
// const sendWhatsApp = require("../utils/sendWhatsApp");
// const BillingRecord = require("../models/BillingRecord");
// const { notifyAdmins } = require("./notificationController");
// const axios = require("axios");

// exports.getPlans = async (req, res) => {
//   try {
//     const plans = await Plan.find();
//     res.json(plans);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch plans" });
//   }
// };

// exports.createCheckoutSession = async (req, res) => {
//   const { planId, adId } = req.body;
//   const userId = req.user._id;

//   try {
//     const plan = await Plan.findById(planId);
//     if (!plan) return res.status(404).json({ error: "Plan not found" });

//     const user = await User.findById(userId);
//     const ad = await Ad.findById(adId);
//     if (!ad) return res.status(404).json({ error: "Ad not found" });

//     // ✅ Admin skips payment
//     if (user.role === "admin") {
//       await AdPlanPurchase.deleteMany({ adId });

//       ad.planId = planId;
//       ad.status = "active";
//       ad.isPublished = true;
//       ad.expiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
//       await ad.save();

//       await new AdPlanPurchase({
//         userId,
//         planId,
//         adId,
//         price: 0,
//       }).save();

//       await new BillingRecord({
//         userId,
//         adId,
//         planId,
//         planName: plan.name,
//         duration: plan.duration,
//         price: 0,
//         paymentSessionId: "admin-free",
//       }).save();

//       return res.json({ message: "Admin ad published without payment" });
//     }

//     // ✅ Regular user - Create Ziina Payment Intent
//     const paymentIntent = await axios.post(
//       "https://api-v2.ziina.com/api/payment_intent",
//       {
//         amount: plan.price * 100, // AED to fils
//         currency_code: "AED",
//         message: `Payment for ${plan.name}`,
//         success_url: `${process.env.FRONTEND_URL}/payment-success?planId=${planId}&adId=${adId}`,
//         cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled/${adId}/`,
//         failure_url: `${process.env.FRONTEND_URL}/payment-failed`,
//         test: false,
//         transaction_source: "directApi",
//         expiry: String(Date.now() + 10 * 60 * 1000),
//         allow_tips: false,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.ZIINA_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const redirectUrl = paymentIntent.data.redirect_url;
//     if (!redirectUrl) {
//       return res.status(500).json({ error: "Failed to create payment link" });
//     }

//     res.json({ url: redirectUrl });

//   } catch (err) {
//     console.error("Ziina payment error:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to initiate payment" });
//   }
// };

// exports.confirmZiinaPayment = async (req, res) => {
//   const { planId, adId } = req.body;
//   const userId = req.user._id;

//   try {
//     const plan = await Plan.findById(planId);
//     const ad = await Ad.findOne({ _id: adId, userId });

//     if (!plan || !ad) {
//       return res.status(404).json({ error: "Ad or Plan not found" });
//     }

//     // 🛡️ DUPLICATE PREVENTION - Check if already processed
//     const existingBilling = await BillingRecord.findOne({
//       userId,
//       adId,
//       planId,
//       paymentSessionId: "ziina-direct-api",
//       purchasedAt: {
//         $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
//       }
//     });

//     if (existingBilling) {
//       console.log("⚠️  Duplicate payment attempt prevented for:", { userId, adId, planId });
//       return res.status(409).json({
//         error: "Payment already processed",
//         billingId: existingBilling._id,
//         message: "This payment has already been confirmed"
//       });
//     }

//     // 🛡️ Check if ad is already active with this plan
//     if (ad.planId && ad.planId.toString() === planId.toString() && ad.isPublished) {
//       const recentPurchase = await AdPlanPurchase.findOne({
//         adId,
//         planId,
//         createdAt: {
//           $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
//         }
//       });

//       if (recentPurchase) {
//         console.log("⚠️  Ad already active with this plan:", { adId, planId });
//         return res.status(409).json({
//           error: "Ad already active",
//           message: "This ad is already published with the selected plan"
//         });
//       }
//     }

//     // 🔄 Process payment confirmation
//     await AdPlanPurchase.deleteMany({ adId });

//     ad.planId = planId;
//     ad.isPublished = true;
//     ad.expiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
//     await ad.save();

//     await new AdPlanPurchase({
//       userId,
//       planId,
//       adId,
//       price: plan.price,
//     }).save();

//     const user = await User.findById(userId);

//     // 💾 Create billing record with timestamp
//     await new BillingRecord({
//       userId,
//       adId,
//       planId,
//       planName: plan.name,
//       duration: plan.duration,
//       price: plan.price,
//       paymentSessionId: "ziina-direct-api",
//       purchasedAt: new Date() // Explicit timestamp
//     }).save();

//     // 📧 Send confirmation email
//     if (user && user.email) {

//       await sendEmail({
//         to: user.email,
//         subject: "🎉 Your Room is Live on Pooqey!",
//         html: `
//     <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
//       <h2 style="color: #2a9d8f;">Hi ${user.fullName},</h2>

//       <p>Welcome to <strong>Pooqey</strong>! 🎉</p>

//       <p>Your listing "<strong>${ad.title}</strong>" is now live and visible to thousands of renters looking for a place just like yours.</p>

//       <ul style="list-style: none; padding-left: 0;">
//         <li>🛏 <strong>Room Title:</strong> ${ad.title}</li>
//         <li>📍 <strong>Location:</strong> ${ad.location}</li>
//         <li>📅 <strong>Listed on:</strong> ${new Date(ad.createdAt).toDateString()}</li>
//         <li>📦 <strong>Plan:</strong> ${plan.name}</li>
//         <li>🆔 <strong>Listing ID:</strong> ${ad._id}</li>
//         <li>💳 <strong>Paid Amount:</strong> AED ${plan.price.toFixed(2)}</li>
// <li>🧾 <strong>Receipt Number:</strong> ziina-${Date.now().toString().slice(-6)}</li>

//       </ul>

//       <p>You can manage or edit your listing anytime from your dashboard.</p>

//       <p>Thank you for listing with <strong>Pooqey</strong> — your key to smarter rentals!</p>

//       <p style="margin-top: 32px;">Warm regards,<br/><strong>Team Pooqey</strong></p>
//     </div>
//   `,
//       });


//     }

//     // 🔔 Notify admins
//     await notifyAdmins({
//       type: "plan-purchased",
//       message: `${user.fullName} purchased plan "${plan.name}" for ad "${ad.title}".`,
//     });

//     console.log("✅ Payment confirmed successfully for:", { userId, adId, planId });
//     res.json({ message: "Payment confirmed and ad published", ad });

//   } catch (err) {
//     console.error("❌ Ziina confirm error:", err);
//     res.status(500).json({ error: "Payment confirmation failed" });
//   }
// };

// // 🧹 Helper function to clean duplicates (run once)
// exports.cleanDuplicateBillingRecords = async (req, res) => {
//   try {
//     const duplicates = await BillingRecord.aggregate([
//       {
//         $group: {
//           _id: {
//             userId: "$userId",
//             adId: "$adId",
//             planId: "$planId",
//             paymentSessionId: "$paymentSessionId"
//           },
//           docs: { $push: "$_id" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $match: { count: { $gt: 1 } }
//       }
//     ]);

//     let deletedCount = 0;

//     for (const duplicate of duplicates) {
//       // Keep the first record, delete the rest
//       const [keep, ...toDelete] = duplicate.docs;

//       await BillingRecord.deleteMany({
//         _id: { $in: toDelete }
//       });

//       deletedCount += toDelete.length;
//       console.log(`Kept ${keep}, deleted ${toDelete.length} duplicates`);
//     }

//     res.json({
//       message: `Cleaned ${deletedCount} duplicate billing records`,
//       duplicateGroups: duplicates.length
//     });

//   } catch (err) {
//     console.error("Error cleaning duplicates:", err);
//     res.status(500).json({ error: "Failed to clean duplicates" });
//   }
// };


// exports.purchasePlan = async (req, res) => {
//   try {
//     const { planId } = req.body;
//     const userId = req.user.id;

//     // Check if plan exists
//     const plan = await Plan.findById(planId);
//     if (!plan) {
//       return res.status(404).json({ error: "Plan not found" });
//     }

//     // Find the most recent unpublished ad of the user
//     const latestAd = await Ad.findOne({
//       userId,
//       isPublished: false,
//     }).sort({ createdAt: -1 });

//     if (!latestAd) {
//       return res
//         .status(400)
//         .json({ error: "No unpublished ad found to attach the plan." });
//     }

//     // Calculate expiry
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + plan.duration); // plan.duration in days

//     // Update ad with plan and expiry
//     latestAd.planId = plan._id;
//     latestAd.isPublished = true;
//     latestAd.expiresAt = expiresAt;
//     await latestAd.save();

//     // Save plan purchase
//     const newPurchase = new AdPlanPurchase({
//       userId,
//       planId,
//       adId: latestAd._id,
//     });

//     await newPurchase.save();

//     res.json({
//       message: "Plan purchased and applied to your ad successfully.",
//       ad: latestAd,
//     });
//   } catch (err) {
//     console.error("Purchase error:", err);
//     res.status(500).json({ error: "Failed to purchase plan" });
//   }
// };

// exports.applyPlanToAd = async (req, res) => {
//   try {
//     const { adId } = req.params;
//     const { planId } = req.body;
//     const userId = req.user._id;

//     const plan = await Plan.findById(planId);
//     if (!plan) {
//       return res.status(404).json({ error: "Plan not found" });
//     }

//     const ad = await Ad.findOne({ _id: adId, userId });
//     if (!ad) {
//       return res.status(404).json({ error: "Ad not found or unauthorized" });
//     }

//     // Set expiry
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + plan.duration);

//     ad.planId = planId;
//     ad.isPublished = true;
//     ad.expiresAt = expiresAt;

//     await ad.save();

//     // Save purchase record
//     await new AdPlanPurchase({ userId, planId, adId }).save();

//     res.json({ message: "Plan applied and ad published", ad });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to apply plan to ad" });
//   }
// };


// // Get all billing records for a user
// exports.getBillingRecords = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const records = await BillingRecord.find({ userId })
//       .populate("planId", "name duration price")
//       .populate("adId", "title")
//       .sort({ purchasedAt: -1 });

//     res.json(records);
//   } catch (err) {
//     console.error("Error fetching billing records:", err);
//     res.status(500).json({ error: "Failed to get billing records" });
//   }
// };









const Plan = require("../models/Plan");
const AdPlanPurchase = require("../models/AdPlanPurchase");
const Ad = require("../models/Ad");
const stripe = require("../config/stripe");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const sendWhatsApp = require("../utils/sendWhatsApp");
const BillingRecord = require("../models/BillingRecord");
const { notifyAdmins } = require("./notificationController");

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
};

exports.createCheckoutSession = async (req, res) => {
  const { planId, adId } = req.body;
  const userId = req.user._id;

  try {
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const user = await User.findById(userId);
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    // ✅ Admin skips payment
    if (user.role === "admin") {
      await AdPlanPurchase.deleteMany({ adId });

      ad.planId = planId;
      ad.status = "active";
      ad.isPublished = true;
      ad.expiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
      await ad.save();

      await new AdPlanPurchase({
        userId,
        planId,
        adId,
        price: 0,
      }).save();

      await new BillingRecord({
        userId,
        adId,
        planId,
        planName: plan.name,
        duration: plan.duration,
        price: 0,
        paymentSessionId: "admin-free",
      }).save();

      return res.json({ message: "Admin ad published without payment" });
    }

    // ✅ Regular user - Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aed',
          product_data: {
            name: plan.name,
            description: `Ad promotion for ${plan.duration} days`
          },
          unit_amount: plan.price * 100, // AED to fils
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&planId=${planId}&adId=${adId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled/${adId}`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
        adId: adId.toString()
      }
    });

   res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
};

exports.confirmStripePayment = async (req, res) => {
  const { sessionId, planId, adId } = req.body;
  const userId = req.user._id;

  try {
    // Verify the payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const plan = await Plan.findById(planId);
    const ad = await Ad.findOne({ _id: adId, userId });

    if (!plan || !ad) {
      return res.status(404).json({ error: "Ad or Plan not found" });
    }

    // 🛡️ DUPLICATE PREVENTION
    const existingBilling = await BillingRecord.findOne({
      userId,
      adId,
      planId,
      paymentSessionId: sessionId
    });

    if (existingBilling) {
      console.log("⚠️  Duplicate payment attempt prevented for:", { userId, adId, planId });
      return res.status(409).json({
        error: "Payment already processed",
        billingId: existingBilling._id,
        message: "This payment has already been confirmed"
      });
    }

    // 🛡️ Check if ad is already active with this plan
    if (ad.planId && ad.planId.toString() === planId.toString() && ad.isPublished) {
      const recentPurchase = await AdPlanPurchase.findOne({
        adId,
        planId,
        createdAt: {
          $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      });

      if (recentPurchase) {
        console.log("⚠️  Ad already active with this plan:", { adId, planId });
        return res.status(409).json({
          error: "Ad already active",
          message: "This ad is already published with the selected plan"
        });
      }
    }

    // 🔄 Process payment confirmation
    await AdPlanPurchase.deleteMany({ adId });

    ad.planId = planId;
    ad.isPublished = true;
    ad.expiresAt = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
    await ad.save();

    await new AdPlanPurchase({
      userId,
      planId,
      adId,
      price: plan.price,
    }).save();

    const user = await User.findById(userId);

    // 💾 Create billing record with timestamp
    await new BillingRecord({
      userId,
      adId,
      planId,
      planName: plan.name,
      duration: plan.duration,
      price: plan.price,
      paymentSessionId: sessionId,
      purchasedAt: new Date(),
      stripePaymentId: session.payment_intent
    }).save();

    // 📧 Send confirmation email
    if (user && user.email) {
      await sendEmail({
        to: user.email,
        subject: "🎉 Your Room is Live on Pooqey!",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
            <h2 style="color: #2a9d8f;">Hi ${user.fullName},</h2>
            <p>Welcome to <strong>Pooqey</strong>! 🎉</p>
            <p>Your listing "<strong>${ad.title}</strong>" is now live and visible to thousands of renters looking for a place just like yours.</p>
            <ul style="list-style: none; padding-left: 0;">
              <li>🛏 <strong>Room Title:</strong> ${ad.title}</li>
              <li>📍 <strong>Location:</strong> ${ad.location}</li>
              <li>📅 <strong>Listed on:</strong> ${new Date(ad.createdAt).toDateString()}</li>
              <li>📦 <strong>Plan:</strong> ${plan.name}</li>
              <li>🆔 <strong>Listing ID:</strong> ${ad._id}</li>
              <li>💳 <strong>Paid Amount:</strong> AED ${plan.price.toFixed(2)}</li>
              <li>🧾 <strong>Receipt Number:</strong> ${session.payment_intent}</li>
            </ul>
            <p>You can manage or edit your listing anytime from your dashboard.</p>
            <p>Thank you for listing with <strong>Pooqey</strong> — your key to smarter rentals!</p>
            <p style="margin-top: 32px;">Warm regards,<br/><strong>Team Pooqey</strong></p>
          </div>
        `,
      });
    }

    // 🔔 Notify admins
    await notifyAdmins({
      type: "plan-purchased",
      message: `${user.fullName} purchased plan "${plan.name}" for ad "${ad.title}".`,
    });

    console.log("✅ Stripe payment confirmed successfully for:", { userId, adId, planId });
    res.json({ message: "Payment confirmed and ad published", ad });

  } catch (err) {
    console.error("❌ Stripe confirm error:", err);
    res.status(500).json({ error: "Payment confirmation failed" });
  }
};

// 🧹 Helper function to clean duplicates (run once)
exports.cleanDuplicateBillingRecords = async (req, res) => {
  try {
    const duplicates = await BillingRecord.aggregate([
      {
        $group: {
          _id: {
            userId: "$userId",
            adId: "$adId",
            planId: "$planId",
            paymentSessionId: "$paymentSessionId"
          },
          docs: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    let deletedCount = 0;

    for (const duplicate of duplicates) {
      // Keep the first record, delete the rest
      const [keep, ...toDelete] = duplicate.docs;

      await BillingRecord.deleteMany({
        _id: { $in: toDelete }
      });

      deletedCount += toDelete.length;
      console.log(`Kept ${keep}, deleted ${toDelete.length} duplicates`);
    }

    res.json({
      message: `Cleaned ${deletedCount} duplicate billing records`,
      duplicateGroups: duplicates.length
    });

  } catch (err) {
    console.error("Error cleaning duplicates:", err);
    res.status(500).json({ error: "Failed to clean duplicates" });
  }
};

exports.purchasePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    // Check if plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Find the most recent unpublished ad of the user
    const latestAd = await Ad.findOne({
      userId,
      isPublished: false,
    }).sort({ createdAt: -1 });

    if (!latestAd) {
      return res
        .status(400)
        .json({ error: "No unpublished ad found to attach the plan." });
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration); // plan.duration in days

    // Update ad with plan and expiry
    latestAd.planId = plan._id;
    latestAd.isPublished = true;
    latestAd.expiresAt = expiresAt;
    await latestAd.save();

    // Save plan purchase
    const newPurchase = new AdPlanPurchase({
      userId,
      planId,
      adId: latestAd._id,
    });

    await newPurchase.save();

    res.json({
      message: "Plan purchased and applied to your ad successfully.",
      ad: latestAd,
    });
  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ error: "Failed to purchase plan" });
  }
};

exports.applyPlanToAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { planId } = req.body;
    const userId = req.user._id;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const ad = await Ad.findOne({ _id: adId, userId });
    if (!ad) {
      return res.status(404).json({ error: "Ad not found or unauthorized" });
    }

    // Set expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration);

    ad.planId = planId;
    ad.isPublished = true;
    ad.expiresAt = expiresAt;

    await ad.save();

    // Save purchase record
    await new AdPlanPurchase({ userId, planId, adId }).save();

    res.json({ message: "Plan applied and ad published", ad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to apply plan to ad" });
  }
};

// Get all billing records for a user
exports.getBillingRecords = async (req, res) => {
  try {
    const userId = req.user._id;
    const records = await BillingRecord.find({ userId })
      .populate("planId", "name duration price")
      .populate("adId", "title")
      .sort({ purchasedAt: -1 });

    res.json(records);
  } catch (err) {
    console.error("Error fetching billing records:", err);
    res.status(500).json({ error: "Failed to get billing records" });
  }
};
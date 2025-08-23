const express = require("express");
const router = express.Router();
const { getPlans, purchasePlan, applyPlanToAd, createCheckoutSession, confirmStripePayment, getBillingRecords } = require("../controllers/plansController");
const authMiddleware = require("../middleware/authMiddleware");

// GET all plans
router.get("/", getPlans);


router.post("/create-checkout-session", authMiddleware, createCheckoutSession);
router.post("/confirm-payment", authMiddleware, confirmStripePayment);

// POST: purchase a plan (user only)
router.post("/purchase", authMiddleware, purchasePlan);

// POST: apply a plan to a specific ad
router.post("/apply/:adId", authMiddleware, applyPlanToAd);
router.get("/billing", authMiddleware, getBillingRecords);


module.exports = router;

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authenticatedRule = require('../middleware/authenticatedRule');
const { getTotalListings, getTotalAdvertisers, getTotalRevenue, getTotalBookings, getAdvertisorInfo, blacklistListing, disableListing, deleteListing, reactivateListing, getTotalListingsbyAdmin, myListings, purchasedPlans, billingRecords } = require("../controllers/adminController");
const router = express.Router();


 router.get('/orlistings' , getTotalListings)
 router.get('/advertisers', authMiddleware , authenticatedRule('admin') , getTotalAdvertisers)
 router.get('/revenue', authMiddleware , authenticatedRule('admin') , getTotalRevenue)
 router.get('/bookings', authMiddleware , authenticatedRule('admin') , getTotalBookings)
 router.get('/advertisers-info', authMiddleware , authenticatedRule('admin') , getAdvertisorInfo)
 router.get('/total-listings', authMiddleware , authenticatedRule('admin') , getTotalListingsbyAdmin)
 router.put('/blacklist-listing/:id', authMiddleware , authenticatedRule('admin') , blacklistListing)
 router.put('/disable-listing/:id', authMiddleware , authenticatedRule('admin') , disableListing)
 router.put('/reactivate/:id', authMiddleware,  authenticatedRule('admin'), reactivateListing); 
 router.delete('/delete-listing/:id', authMiddleware , authenticatedRule('admin') , deleteListing)
 router.get('/myListings', authMiddleware , authenticatedRule('admin') , myListings)
 router.get('/purchased-plans', authMiddleware , authenticatedRule('admin') , purchasedPlans)
 router.get('/billing-records', authMiddleware , authenticatedRule('admin') , billingRecords)


module.exports = router



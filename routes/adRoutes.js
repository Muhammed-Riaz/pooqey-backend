const express = require("express");
const router = express.Router();
const { 
  createAd, getAdsByPlanPriority, adViews, adClicks, 
  getSingleAd, getUserAds, markAdsOccupied, updateAdStatus, 
  deleteAd, updateAd, addFavoriteCount, 
  searchRequest, searchRequestmob, searchExtraRequest , getUserFavorites,removeFavoriteCount,getAllAds, renewListing
} = require("../controllers/adController");
const authMiddleware = require("../middleware/authMiddleware");

// STATIC ROUTES FIRST
router.post("/renew-listing", renewListing);
router.get('/public', getAllAds);
router.post("/create", authMiddleware, createAd);
router.get("/my_ads", authMiddleware, getUserAds);
router.get("/by-plan-priority",  getAdsByPlanPriority);
router.post("/mark-occupied", authMiddleware, markAdsOccupied);


router.post('/search', searchRequest);
router.post('/search_mob', searchRequestmob);
router.post('/search-extra', searchExtraRequest);   // Correct path

// DYNAMIC ROUTES LAST
router.post('/:id/favorite',authMiddleware, addFavoriteCount);
router.delete('/:id/favorite', authMiddleware, removeFavoriteCount);
router.get('/user/favorite', authMiddleware, getUserFavorites);

router.post('/:id/view', adViews);
router.post('/:id/click', adClicks);

router.patch("/:id/status", authMiddleware, updateAdStatus);
router.put('/:id', authMiddleware, updateAd);
router.delete('/delete/:id', authMiddleware, deleteAd);
router.get('/:id', getSingleAd);   // LAST


module.exports = router;

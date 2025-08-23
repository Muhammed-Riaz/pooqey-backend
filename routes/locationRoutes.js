const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// GET /api/locations — full list of "City, Area"
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({}, 'city area');
    const locations = ads
      .map(ad => `${ad.city}, ${ad.area}`)
      .filter(Boolean);

    const uniqueLocations = [...new Set(locations)];
    res.json({ locations: uniqueLocations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/locations/suggestions?term=xyz — filtered "City, Area"
router.get('/suggestions', async (req, res) => {
  const term = req.query.term;
  if (!term) {
    res.json({ locations: [] });
    return;
  }

  try {
    const ads = await Ad.find({
      $or: [
        { city: { $regex: term, $options: 'i' } },
        { area: { $regex: term, $options: 'i' } }
      ]
    }, 'city area');

    const locations = ads
      .map(ad => `${ad.city}, ${ad.area}`)
      .filter(Boolean);

    const uniqueLocations = [...new Set(locations)];
    res.json({ locations: uniqueLocations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

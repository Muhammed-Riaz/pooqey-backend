const amenityCategoryMap = {
  "furnished": "essentials",
  "air-conditioning": "essentials",
  "wifi": "essentials",
  "electricity-included": "essentials",
  "water-included": "essentials",
  "gas-included": "essentials",
  "all-bills-included": "essentials",
  "bed-linens": "essentials",
  "towels": "essentials",
  "hangers": "essentials",
  "room-darkening-shades": "essentials",

  "shared-bathroom": "bathroom",
  "private-bathroom": "bathroom",
  "hot-water": "bathroom",
  "shower": "bathroom",
  "bathtub": "bathroom",
  "shampoo": "bathroom",
  "conditioner": "bathroom",
  "body-soap": "bathroom",
  "shower-gel": "bathroom",
  "hair-dryer": "bathroom",
  "bidet": "bathroom",
  "cleaning-products": "bathroom",

  "shared-kitchen": "kitchenandDining",
  "private-kitchen": "kitchenandDining",
  "refrigerator": "kitchenandDining",
  "microwave": "kitchenandDining",
  "oven": "kitchenandDining",
  "stove-cooker": "kitchenandDining",
  "kettle-coffee-maker": "kitchenandDining",
  "utensils-cookware": "kitchenandDining",
  "dining-table": "kitchenandDining",

  "laundry-access": "laundry",
  "washing-machine": "laundry",
  "dryer": "laundry",
  "iron": "laundry",
  "drying-rack": "laundry",

  "wardrobe": "homeFeatures",
  "tv": "homeFeatures",
  "study-desk": "homeFeatures",
  "private-entrance": "homeFeatures",
  "balcony-terrace": "homeFeatures",
  "garden": "homeFeatures",

  "smoke-alarm": "safetyandSecurity",
  "fire-extinguisher": "safetyandSecurity",
  "first-aid-kit": "safetyandSecurity",
  "smart-lock": "safetyandSecurity",
  "cctv": "safetyandSecurity",

  "cleaning-services": "cleaningandHousekeeping",
  "daily-weekly-cleaning": "cleaningandHousekeeping",
  "housekeeping": "cleaningandHousekeeping",

  "swimming-pool": "recreationAndWellness",
  "gym": "recreationAndWellness",
  "jacuzzi": "recreationAndWellness",
  "sauna": "recreationAndWellness",
  "children-play-area": "recreationAndWellness",
  "tennis-court": "recreationAndWellness",
  "soccer-court": "recreationAndWellness",
  "jogging-track": "recreationAndWellness",

  "parking": "accessAndParking",
  "24-7-access": "accessAndParking",

  "smoking-allowed": "guestAccessAndRules",
  "pet-friendly": "guestAccessAndRules",
  "maintenance-included": "guestAccessAndRules",
};


// helper function
function organizeAmenities(flatAmenities) {
  const structured = {
    essentials: [],
    bathroom: [],
    kitchenandDining: [],
    laundry: [],
    homeFeatures: [],
    safetyandSecurity: [],
    cleaningandHousekeeping: [],
    recreationAndWellness: [],
    accessAndParking: [],
    guestAccessAndRules: []
  };

 flatAmenities.forEach(item => {
    const category = amenityCategoryMap[item];
    if (category) structured[category].push(item);
  });

  return structured;
}

module.exports = { organizeAmenities };
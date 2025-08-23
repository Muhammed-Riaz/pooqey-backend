// seeder.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Plan = require("./models/Plan");

dotenv.config();

const plans = [
  {
    name: "Free",
    price: 0,
    badge: null,
    positionText: "Fourth Position After Standard Plan",
    duration: 30,
    autoUpdateDays: 0,
  },
  {
    name: "Standard",
    price: 39,
    badge: "Standard",
    positionText: "Third Position After Featured Plan",
    duration: 30,
    autoUpdateDays: 30,
  },
  {
    name: "Featured",
    price: 79,
    badge: "Featured",
    positionText: "Second Position After Premium Plan",
    duration: 30,
    autoUpdateDays: 30,
  },
  {
    name: "Premium",
    price: 139,
    badge: "Premium",
    positionText: "First Position",
    duration: 30,
    autoUpdateDays: 30,
  },
];

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    await Plan.deleteMany(); 
    await Plan.insertMany(plans);
    console.log("Plans seeded successfully!");
    process.exit();
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });



  // for save packages run node seeder.js in terminal 




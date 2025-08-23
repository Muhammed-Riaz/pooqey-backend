// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// require('dotenv').config();
// require("./cron/expireAdsJob");
// const passport = require('passport');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const cookieParser = require('cookie-parser');
// const csrf = require('csurf');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // ===== Middleware =====
// app.use('/uploads', express.static('uploads'));
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true,
// }));

// app.use(cookieParser());

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: process.env.MONGO_URI,
//     collectionName: 'sessions'
//   }),
  
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 24,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
//   }
// }));

// // ===== Passport =====
// require('./config/passport');
// app.use(passport.initialize());
// app.use(passport.session());

// // ===== MongoDB =====
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('✅ MongoDB connected'))
// .catch(err => console.error(err));

// // ===== Custom Middlewares =====
// const errorHandler = require('./middleware/errorMiddleware');
// const protect = require('./middleware/protect');
// const authenticatedRule = require('./middleware/authenticatedRule');
// const csrfProtection = csrf({ cookie: false });

// // ===== Routes =====
// app.get('/api/csrf-token', csrfProtection, (req, res) => {
//   res.json({ csrfToken: req.csrfToken() });
// });

// // Public routes
// app.use('/api/auth', csrfProtection, require('./routes/authRoutes'));
// app.use('/api/plans', require('./routes/plansRoutes'));
// app.use('/api/ads', require('./routes/adRoutes')); // ✅ Public ads
// app.use('/api/ads/reviews', require('./routes/reviewRoutes')); // ✅ Public reviews
// app.use('/api/locations', require('./routes/locationRoutes'));
// app.use('/api/reports', require('./routes/reportroute'));

// // Protected routes
// app.use('/api/users', protect, csrfProtection, require('./routes/userRoutes'));
// app.use('/api/client', protect, require('./routes/clientDataRoutes'));
// app.use('/api/notifications', protect, require('./routes/notificationRoutes'));
// app.use('/api/invoice', protect, require('./routes/invoice'));
// app.use('/api/bookings', protect, authenticatedRule('advertiser'), require('./routes/bookingRoutes'));
// app.use('/api/admin', protect, authenticatedRule('admin'), require('./routes/adminRoutes'));

// // Error handler
// app.use(errorHandler);

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });





const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced CORS configuration
const allowedOrigins = ['http://localhost:3000', 'https://pooqey.ae'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // PATCH add kiya
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport initialization
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error(err));

// ===== Custom Middlewares =====
const errorHandler = require('./middleware/errorMiddleware');
const protect = require('./middleware/protect');
const authenticatedRule = require('./middleware/authenticatedRule');

// ===== Routes =====
// Public routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/plansRoutes'));
app.use('/api/ads', require('./routes/adRoutes'));
app.use('/api/ads', require('./routes/reviewRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/reports', require('./routes/reportroute'));

// Protected routes
app.use('/api/users', protect, require('./routes/userRoutes'));
app.use('/api/client', protect, require('./routes/clientDataRoutes'));
app.use('/api/notifications', protect, require('./routes/notificationRoutes'));
app.use('/api/invoice', protect, require('./routes/invoice'));
app.use('/api', protect, authenticatedRule('advertiser'), require('./routes/bookingRoutes'));
app.use('/api/admin', protect, authenticatedRule('admin'), require('./routes/adminRoutes'));

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

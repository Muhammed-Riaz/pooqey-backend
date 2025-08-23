const Booking = require('../models/Booking');
const Ad = require('../models/Ad');
const { validationResult } = require('express-validator');
const BookingRecords = require('../models/BookingRecords');

// create booking for calender

exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { adId, status, client, month, year, date, endDate, notes } = req.body;

    // Verify ad exists and belongs to user
    const ad = await Ad.findOne({ _id: adId, userId: req.user.id });
    if (!ad) {
      return res.status(404).json({ msg: 'Ad not found or not authorized' });
    }

    // Convert dates to proper Date objects
    const checkInDate = new Date(date);
    const checkOutDate = new Date(endDate);

    // Check for conflicting bookings
    const existingBooking = await Booking.findOne({
      ad: adId,
      _id: { $ne: req.params?.id }, // Only relevant if updating
      $or: [
        {
          date: { $lte: checkOutDate },
          endDate: { $gte: checkInDate }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({
        message: 'This property is already booked for the selected dates',
        conflictingBooking: existingBooking
      });
    }

    // Create new booking
    const booking = new Booking({
      user: req.user.id,
      ad: adId,
      adTitle: ad.title,
      date: checkInDate,
      endDate: checkOutDate,
      status: status || 'occupied',
      client: {
        name: client.name,
        whatsapp: client.whatsapp,
        location: client.location,
        persons: client.persons || 1
      },
      month,
      year,
      notes: notes || ''
    });

    await booking.save();

    // Populate ad fields in the response
    const bookingWithAd = await Booking.findById(booking._id)
      .populate('ad', 'title images roomType');

    res.status(201).json({
      success: true,
      data: bookingWithAd
    });

  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// get booking for clender 

exports.getBookings = async (req, res) => {
  try {
    const { month, year, adId, status } = req.query;
    const query = { user: req.user.id };

    // Apply filters
    if (month && year) {
      query.month = month;
      query.year = year;
    }
    if (adId) {
      query.ad = adId;
    }
    if (status) {
      query.status = status;
    }

    // Get bookings with populated ad details
    const bookings = await Booking.find(query)
      .sort({ date: 1 })
      .populate({
        path: 'ad',
        select: 'title roomType rentalType price amenities images location city status availableFrom viewCount averageRating',
        populate: {
          path: 'purchases',
          select: 'planType duration'
        }
      });

    // Enhance booking data with calculated fields
    const enhancedBookings = bookings.map(booking => {
      const checkIn = new Date(booking.date);
      const checkOut = new Date(booking.endDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      // Calculate total amount (handle cases where price might be string)
      const price = parseFloat(booking.ad?.price) || 0;
      const totalAmount = nights * price;

      // Extract important amenities
      const mainAmenities = [
        ...(booking.ad?.amenities?.essentials || []),
        ...(booking.ad?.amenities?.bathroom || []),
        ...(booking.ad?.amenities?.kitchenandDining || [])
      ].slice(0, 5);

      return {
        ...booking.toObject(),
        durationNights: nights,
        totalAmount,
        roomDetails: {
          basicInfo: {
            type: booking.ad?.roomType,
            rentalType: booking.ad?.rentalType,
            price: price,
            city: booking.ad?.city,
            location: booking.ad?.location,
            status: booking.ad?.status,
            availableFrom: booking.ad?.availableFrom,
            viewCount: booking.ad?.viewCount || 0,
            rating: booking.ad?.averageRating || 0
          },
          amenities: mainAmenities,
          allAmenities: booking.ad?.amenities || {},
          images: booking.ad?.images || [],
          activePlan: booking.ad?.purchases?.[0] || null
        },
        timeline: {
          checkIn: checkIn,
          checkOut: checkOut,
          bookedAt: booking.createdAt
        }
      };
    });

    // Calculate summary statistics
    const totals = {
      totalBookings: enhancedBookings.length,
      totalNights: enhancedBookings.reduce((sum, b) => sum + b.durationNights, 0),
      totalRevenue: enhancedBookings.reduce((sum, b) => sum + b.totalAmount, 0),
      byStatus: enhancedBookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {}),
      byRoomType: enhancedBookings.reduce((acc, booking) => {
        const type = booking.ad?.roomType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      count: enhancedBookings.length,
      data: enhancedBookings,
      summary: totals,
      filters: {
        month,
        year,
        adId,
        status
      }
    });

  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};


// booking record added 

exports.addBookingRecord = async (req, res) => {
  try {
    const booking = new BookingRecords({
      ...req.body,
      user: req.user.id 
    });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save booking' });
  }
};


// get booking record 

exports.getBookingRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await BookingRecords.find({ user: userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};



// get monthly turnover 

exports.monthlyTurnover = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Construct date range for the month
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(`${year}-${parseInt(month) + 1}-01`);

    const bookings = await BookingRecords.find({
      checkIn: { $gte: start, $lt: end }
    });

    // Sum all 'paid' fields, converting them to numbers
    const totalTurnover = bookings.reduce((sum, b) => {
      const amount = parseFloat(b.paid.replace(/[^0-9.-]+/g, '')) || 0; 
      return sum + amount;
    }, 0);

    res.json({ month, year, totalTurnover });

  } catch (err) {
    console.error('Error calculating turnover:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
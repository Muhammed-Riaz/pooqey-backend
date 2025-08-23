const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { notifyAdmins } = require('./notificationController');

exports.registerUser = async (req, res, next) => {
  const { name, email, phone, company, password, role, terms } = req.body;


  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName: name,
      email,
      phone,
      company,
      role,
      terms,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    await sendEmail({
      to: email,
      subject: 'Welcome to Rental Platform',
      text: `Hello ${name},\n\nThanks for registering on our platform!`,
    });

    await notifyAdmins({
      type: "new-user",
      message: `${savedUser.fullName} has just registered on the platform.`,
    });


    res.status(201).json({
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      role: savedUser.role,
      token: generateToken(savedUser._id),
      profileImage: savedUser.profileImage || "",

      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500);
    next(error);  // pass error to middleware
  }
};




exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      profileImage: user.profileImage || "",

      // ✅ this was missing
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



// update profile 

// Update profile controller
exports.updateProfile = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      company: req.body.company,
      bio: req.body.bio,
      city: req.body.city,
      website: req.body.website,
      advertiserName: req.body.advertiserName,
      agencyName: req.body.agencyName,
      licenseNumber: req.body.licenseNumber,
      dedNumber: req.body.dedNumber,
      rating: req.body.rating,
      socialLinks: req.body.socialLinks,
    };

    // Handle social media separately
    if (req.body.socialMedia) {
      updates.socialMedia = {
        ...req.user.socialMedia,
        ...req.body.socialMedia
      };
    }

    if (req.file) {
      updates.profileImage = `/uploads/profile-images/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updates, 
      { new: true }
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Profile update failed' });
  }
}


// get user profile

// get user profile
exports.myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure all keys are present even if empty
    const paddedUser = {
      _id: user._id,
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      company: user.company || "",
      role: user.role || "",
      terms: user.terms || false,
      profileImage: user.profileImage || "",
      bio: user.bio || "",
      city: user.city || "",
      website: user.website || "",
      rating: user.rating || "",
      advertiserName: user.advertiserName || "",
      agencyName: user.agencyName || "",
      licenseNumber: user.licenseNumber || "",
      dedNumber: user.dedNumber || "",
      isVerified: user.isVerified || false,
      socialLinks: user.socialLinks || [],
      socialMedia: user.socialMedia || {},
      authMethod: user.authMethod || "",
      googleId: user.googleId || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      __v: user.__v,
    };

    res.json(paddedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// change password 


exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new passwords are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedNewPassword;

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      text: `Hi ${user.fullName}, your password was successfully changed.`,
      html: `
        <p>Hi <strong>${user.fullName}</strong>,</p>
        <p>This is a confirmation that your account password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
        <p>If you did not request this change, please reset your password immediately or contact our support team.</p>
        <br />
        <p>Regards,<br/>Pooqey Platform Team</p>
      `
    });

    return res.status(200).json({ message: 'Password changed and confirmation email sent.' });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};









// const User = require('../models/User');

// // update profile
// exports.updateProfile = async (req, res) => {
//   try {
//     const updates = {
//       fullName: req.body.fullName,
//       phone: req.body.phone,
//       company: req.body.company,
//       bio: req.body.bio,
//       city: req.body.city,
//       website: req.body.website,
//     };

//     if (req.file) {
//       updates.profileImage = `/uploads/profile-images/${req.file.filename}`;
//     }

//     const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
//     res.json(updatedUser);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Profile update failed' });
//   }
// };

// // get user profile
// exports.myProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password');
//     if (!user) return res.status(404).json({ error: 'User not found' });
//     res.json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

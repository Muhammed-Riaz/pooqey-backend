const express = require('express');
const router = express.Router();

const { registerUser , loginUser, updateProfile, myProfile, changePassword } = require("../controllers/userController");
const authMiddleware = require('../middleware/authMiddleware');
const uploadProfile = require('../middleware/uploadProfile');

router.post('/register', registerUser)
router.post('/login', loginUser);
router.put('/profile', authMiddleware, uploadProfile.single('profileImage'),  updateProfile);
router.get('/me', authMiddleware, myProfile);
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  registerAdmin,
  registerLocationManager,
  registerGuest,
  login,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/register/admin', protect, authorize('user:manage'), registerAdmin);
router.post('/register/location-manager', protect, authorize('user:manage'), registerLocationManager);
router.post('/register/guest', registerGuest);
router.post('/login', login);

module.exports = router;

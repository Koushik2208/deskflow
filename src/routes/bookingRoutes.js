const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancelBooking,
  checkIn,
  checkOut,
} = require('../controllers/bookingController');

router.post('/', protect, authorize('booking:create'), createBooking);
router.get('/my', protect, authorize('booking:view_own'), getMyBookings);
router.get('/all', protect, authorize('booking:view_all'), getAllBookings);
router.get('/:id', protect, authorize('booking:view_own'), getBookingById);
router.put('/:id/cancel', protect, authorize('booking:cancel_own'), cancelBooking);
router.put('/:id/checkin', protect, authorize('booking:checkin'), checkIn);
router.put('/:id/checkout', protect, authorize('booking:checkout'), checkOut);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createGuestPass,
  getMyGuestPasses,
  getGuestPassById,
  revokeGuestPass,
} = require('../controllers/guestPassController');

router.post('/', protect, authorize('guestpass:create'), createGuestPass);
router.get('/my', protect, authorize('guestpass:view'), getMyGuestPasses);
router.get('/:id', protect, authorize('guestpass:view'), getGuestPassById);
router.put('/:id/revoke', protect, authorize('guestpass:revoke'), revokeGuestPass);

module.exports = router;

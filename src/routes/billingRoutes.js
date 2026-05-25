const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMyBilling,
  getAllBilling,
  getBillingById,
} = require('../controllers/billingController');

router.get('/my', protect, authorize('billing:view_own'), getMyBilling);
router.get('/all', protect, authorize('billing:view_all'), getAllBilling);
router.get('/:id', protect, authorize('billing:view_own'), getBillingById);

module.exports = router;

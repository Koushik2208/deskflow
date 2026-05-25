const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createReview,
  getSpaceReviews,
  deleteReview,
} = require('../controllers/reviewController');

router.post('/', protect, authorize('review:create'), createReview);
router.get('/space/:spaceId', protect, authorize('review:view'), getSpaceReviews);
router.delete('/:id', protect, authorize('review:delete_own'), deleteReview);

module.exports = router;

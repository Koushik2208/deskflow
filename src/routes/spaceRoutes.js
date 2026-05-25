const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createSpace,
  getAllSpaces,
  getSpaceById,
  updateSpace,
  deleteSpace,
  checkAvailability,
} = require('../controllers/spaceController');

router.get('/', protect, authorize('space:view'), getAllSpaces);
router.post('/', protect, authorize('space:create'), createSpace);
router.get('/availability', protect, authorize('space:availability'), checkAvailability);
router.get('/:id', protect, authorize('space:view'), getSpaceById);
router.put('/:id', protect, authorize('space:update'), updateSpace);
router.delete('/:id', protect, authorize('space:delete'), deleteSpace);

module.exports = router;

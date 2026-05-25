const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  assignManager,
} = require('../controllers/locationController');

router.get('/', protect, authorize('location:view'), getAllLocations);
router.post('/', protect, authorize('location:create'), createLocation);
router.put('/:id/assign-manager', protect, authorize('location:assign_manager'), assignManager);
router.get('/:id', protect, authorize('location:view'), getLocationById);
router.put('/:id', protect, authorize('location:update'), updateLocation);
router.delete('/:id', protect, authorize('location:delete'), deleteLocation);

module.exports = router;

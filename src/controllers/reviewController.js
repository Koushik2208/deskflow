const mongoose = require('mongoose');
const Review = require('../models/Review');
const Space = require('../models/Space');
const Booking = require('../models/Booking');

const createReview = async (req, res) => {
  const { spaceId, rating, comment } = req.body;

  if (typeof spaceId !== 'string' || !mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space id' });
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
  }

  const space = await Space.findById(spaceId);
  if (!space || !space.isActive) {
    return res.status(404).json({ message: 'Space not found or inactive' });
  }

  const existing = await Review.findOne({ user: req.user._id, space: spaceId });
  if (existing) {
    return res.status(409).json({ message: 'You have already reviewed this space' });
  }

  const { role } = req.user;
  if (role === 'member') {
    const completedBooking = await Booking.findOne({
      user: req.user._id,
      space: spaceId,
      status: 'completed',
    });
    if (!completedBooking) {
      return res.status(403).json({ message: 'You can only review spaces you have completed a booking at' });
    }
  }

  const review = await Review.create({ user: req.user._id, space: spaceId, rating, comment });
  return res.status(201).json(review);
};

const getSpaceReviews = async (req, res) => {
  const { spaceId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space id' });
  }
  const reviews = await Review.find({ space: spaceId })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
};

const deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });

  if (req.user.role !== 'admin' && !review.user.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await Review.findOneAndDelete({ _id: req.params.id });
  res.json({ message: 'Review deleted' });
};

module.exports = { createReview, getSpaceReviews, deleteReview };

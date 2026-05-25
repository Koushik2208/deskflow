const mongoose = require('mongoose');
const GuestPass = require('../models/GuestPass');
const Booking = require('../models/Booking');

const createGuestPass = async (req, res) => {
  const { bookingId, expiresAt } = req.body;

  if (typeof bookingId !== 'string' || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ message: 'Invalid booking id' });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (booking.status !== 'confirmed') {
    return res.status(400).json({ message: 'Booking must be confirmed' });
  }

  const { role } = req.user;
  if (role === 'member') {
    if (!booking.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (role === 'location_manager') {
    if (!req.user.assignedLocation || !booking.location.equals(req.user.assignedLocation)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  const expiry = new Date(expiresAt);
  if (isNaN(expiry.getTime()) || expiry <= new Date()) {
    return res.status(400).json({ message: 'expiresAt must be a valid future date' });
  }

  const existing = await GuestPass.findOne({ booking: bookingId, status: 'active' });
  if (existing) {
    return res.status(409).json({ message: 'An active guest pass already exists for this booking' });
  }

  const guestPass = await GuestPass.create({
    createdBy: req.user._id,
    guest: null,
    booking: bookingId,
    expiresAt: expiry,
  });

  return res.status(201).json(guestPass);
};

const getMyGuestPasses = async (req, res) => {
  const guestPasses = await GuestPass.find({ createdBy: req.user._id })
    .select('-token')
    .populate('booking', 'date startTime endTime space location')
    .populate('guest', 'name email');
  res.json(guestPasses);
};

const getGuestPassById = async (req, res) => {
  const guestPass = await GuestPass.findById(req.params.id)
    .select('-token')
    .populate('booking')
    .populate('guest', 'name email');
  if (!guestPass) return res.status(404).json({ message: 'Guest pass not found' });

  if (req.user.role === 'member' && !guestPass.createdBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(guestPass);
};

const revokeGuestPass = async (req, res) => {
  const guestPass = await GuestPass.findById(req.params.id).select('-token');
  if (!guestPass) return res.status(404).json({ message: 'Guest pass not found' });

  if (guestPass.status !== 'active') {
    return res.status(400).json({ message: 'Only active guest passes can be revoked' });
  }

  const { role } = req.user;
  if (role === 'member') {
    if (!guestPass.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (role === 'location_manager') {
    const booking = await Booking.findById(guestPass.booking);
    if (!booking || !req.user.assignedLocation || !booking.location.equals(req.user.assignedLocation)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  guestPass.status = 'revoked';
  await guestPass.save();
  res.json(guestPass);
};

module.exports = { createGuestPass, getMyGuestPasses, getGuestPassById, revokeGuestPass };

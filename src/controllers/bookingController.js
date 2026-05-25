const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Space = require('../models/Space');
const BillingRecord = require('../models/BillingRecord');
const RecurringBookingGroup = require('../models/RecurringBookingGroup');
const GuestPass = require('../models/GuestPass');

const checkOverlap = async (spaceId, date, startTime, endTime, excludeBookingId = null) => {
  const query = {
    space: spaceId,
    date,
    status: 'confirmed',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const conflict = await Booking.findOne(query);
  return !!conflict;
};

const calcAmount = (startTime, endTime, pricePerHour) => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
  return Math.round((durationMinutes / 60) * pricePerHour * 100) / 100;
};

const parseBookingDateTime = (date, timeStr) => {
  const d = new Date(date);
  const [h, m] = timeStr.split(':').map(Number);
  d.setUTCHours(h, m, 0, 0);
  return d;
};

const generateOccurrences = (startDate, endDate, type) => {
  const dates = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    if (type === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  return dates;
};

const createBooking = async (req, res) => {
  const { space: spaceId, location, date, startTime, endTime, recurringType, recurringEndDate } = req.body;

  if (
    typeof spaceId !== 'string' ||
    typeof location !== 'string' ||
    typeof date !== 'string' ||
    typeof startTime !== 'string' ||
    typeof endTime !== 'string'
  ) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid space id' });
  }
  if (!mongoose.Types.ObjectId.isValid(location)) {
    return res.status(400).json({ message: 'Invalid location id' });
  }

  const fetchedSpace = await Space.findById(spaceId);
  if (!fetchedSpace || !fetchedSpace.isActive) {
    return res.status(404).json({ message: 'Space not found or inactive' });
  }

  if (!fetchedSpace.location.equals(location)) {
    return res.status(400).json({ message: 'Location does not match space location' });
  }

  const bookingDate = new Date(date);
  const isRecurring = recurringType && recurringType !== 'none';

  if (!isRecurring) {
    const conflict = await checkOverlap(fetchedSpace._id, bookingDate, startTime, endTime);
    if (conflict) {
      return res.status(409).json({ message: 'Space is not available for the requested time' });
    }

    const totalAmount = calcAmount(startTime, endTime, fetchedSpace.pricePerHour);
    const booking = await Booking.create({
      user: req.user._id,
      space: fetchedSpace._id,
      location,
      date: bookingDate,
      startTime,
      endTime,
      recurringType: 'none',
      status: 'confirmed',
      totalAmount,
    });

    const billingRecord = await BillingRecord.create({
      booking: booking._id,
      user: req.user._id,
      location,
      amount: totalAmount,
      description: `Booking for ${fetchedSpace.name} on ${date}`,
      generatedBy: null,
    });

    return res.status(201).json({ booking, billingRecord });
  }

  if (!recurringEndDate) {
    return res.status(400).json({ message: 'recurringEndDate is required for recurring bookings' });
  }
  const endDate = new Date(recurringEndDate);
  if (endDate <= bookingDate) {
    return res.status(400).json({ message: 'recurringEndDate must be after date' });
  }

  const occurrences = generateOccurrences(bookingDate, endDate, recurringType);

  if (occurrences.length > 52) {
    return res.status(400).json({
      message: 'Recurring booking may not span more than 52 occurrences',
    });
  }

  const conflictingBookings = await Booking.find({
    space: fetchedSpace._id,
    date: { $in: occurrences },
    status: 'confirmed',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  if (conflictingBookings.length > 0) {
    const unavailableDates = conflictingBookings.map((b) => b.date);
    return res.status(409).json({
      message: 'Recurring booking conflicts on some dates',
      unavailableDates,
    });
  }

  const totalAmount = calcAmount(startTime, endTime, fetchedSpace.pricePerHour);

  const group = await RecurringBookingGroup.create({
    bookings: [],
    recurringType,
    startDate: bookingDate,
    endDate,
    status: 'active',
    createdBy: req.user._id,
  });

  const bookings = await Promise.all(
    occurrences.map((occDate) =>
      Booking.create({
        user: req.user._id,
        space: fetchedSpace._id,
        location,
        date: occDate,
        startTime,
        endTime,
        recurringType,
        recurringEndDate: endDate,
        recurringGroup: group._id,
        status: 'confirmed',
        totalAmount,
      })
    )
  );

  group.bookings = bookings.map((b) => b._id);
  await group.save();

  const billingRecords = await Promise.all(
    bookings.map((booking) =>
      BillingRecord.create({
        booking: booking._id,
        user: req.user._id,
        location,
        amount: totalAmount,
        description: `Booking for ${fetchedSpace.name} on ${booking.date.toISOString().split('T')[0]}`,
        generatedBy: null,
      })
    )
  );

  return res.status(201).json({ bookings, recurringGroup: group, billingRecords });
};

const getMyBookings = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.user.role === 'guest') {
    filter.guestPass = { $ne: null };
  }
  const bookings = await Booking.find(filter)
    .populate('space', 'name type')
    .populate('location', 'name city');
  res.json(bookings);
};

const getAllBookings = async (req, res) => {
  const filter = {};
  if (req.user.role === 'location_manager') {
    filter.location = req.user.assignedLocation;
  }
  const bookings = await Booking.find(filter)
    .populate('user', 'name email')
    .populate('space', 'name type')
    .populate('location', 'name city');
  res.json(bookings);
};

const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('space')
    .populate('location')
    .populate('user', 'name email');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const { role } = req.user;
  if (role === 'member') {
    if (!booking.user._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (role === 'guest') {
    if (!booking.guestPass) return res.status(403).json({ message: 'Forbidden' });
    const guestPass = await GuestPass.findById(booking.guestPass);
    if (!guestPass || !guestPass.guest || !guestPass.guest.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (role === 'location_manager' &&
      !booking.location.equals(req.user.assignedLocation)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(booking);
};

const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
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

  booking.status = 'cancelled';
  await booking.save();
  res.json(booking);
};

const checkIn = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.checkedInAt) return res.status(400).json({ message: 'Already checked in' });
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ message: 'Booking is not confirmed' });
  }

  if (req.user.role === 'member' && !booking.user.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.user.role === 'guest') {
    if (!booking.guestPass) return res.status(403).json({ message: 'Forbidden' });
    const guestPass = await GuestPass.findById(booking.guestPass);
    if (!guestPass || !guestPass.guest || !guestPass.guest.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  const now = new Date();
  const startDt = parseBookingDateTime(booking.date, booking.startTime);
  const endDt = parseBookingDateTime(booking.date, booking.endTime);
  const windowStart = new Date(startDt.getTime() - 15 * 60 * 1000);

  if (now < windowStart) {
    return res.status(400).json({ message: 'Check-in window not yet open (opens 15 minutes before start time)' });
  }
  if (now >= endDt) {
    return res.status(400).json({ message: 'Check-in window has closed' });
  }

  booking.checkedInAt = new Date();
  await booking.save();
  res.json(booking);
};

const checkOut = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!booking.checkedInAt) return res.status(400).json({ message: 'Not checked in' });
  if (booking.checkedOutAt) return res.status(400).json({ message: 'Already checked out' });

  if (req.user.role === 'member' && !booking.user.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.user.role === 'guest') {
    if (!booking.guestPass) return res.status(403).json({ message: 'Forbidden' });
    const guestPass = await GuestPass.findById(booking.guestPass);
    if (!guestPass || !guestPass.guest || !guestPass.guest.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  booking.checkedOutAt = new Date();
  booking.status = 'completed';
  await booking.save();
  res.json(booking);
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancelBooking,
  checkIn,
  checkOut,
};

const mongoose = require('mongoose');
const Space = require('../models/Space');
const Booking = require('../models/Booking');

const createSpace = async (req, res) => {
  const { name, type, location, pricePerHour, pricePerDay, capacity, amenities } = req.body;
  if (req.user.role === 'location_manager') {
    if (typeof location !== 'string' || !mongoose.Types.ObjectId.isValid(location)) {
      return res.status(400).json({ message: 'Invalid location id' });
    }
    if (!req.user.assignedLocation || !req.user.assignedLocation.equals(location)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }
  const space = await Space.create({ name, type, location, pricePerHour, pricePerDay, capacity, amenities });
  res.status(201).json(space);
};

const getAllSpaces = async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin' && req.user.role !== 'location_manager') {
    filter.isActive = true;
  }
  const { location, type, minPrice, maxPrice, capacity } = req.query;
  if (location && mongoose.Types.ObjectId.isValid(location)) {
    filter.location = location;
  }
  if (type) filter.type = type;
  if (minPrice !== undefined) filter.pricePerHour = { ...filter.pricePerHour, $gte: Number(minPrice) };
  if (maxPrice !== undefined) filter.pricePerHour = { ...filter.pricePerHour, $lte: Number(maxPrice) };
  if (capacity !== undefined) filter.capacity = { $gte: Number(capacity) };

  const spaces = await Space.find(filter);
  res.json(spaces);
};

const getSpaceById = async (req, res) => {
  const space = await Space.findById(req.params.id).populate('location', 'name city');
  if (!space) return res.status(404).json({ message: 'Space not found' });
  if (!space.isActive && ['member', 'guest'].includes(req.user.role)) {
    return res.status(404).json({ message: 'Space not found' });
  }
  res.json(space);
};

const updateSpace = async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) return res.status(404).json({ message: 'Space not found' });

  if (req.user.role === 'location_manager') {
    if (!req.user.assignedLocation || !space.location.equals(req.user.assignedLocation)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  const { name, type, pricePerHour, pricePerDay, capacity, amenities, isActive } = req.body;
  if (name !== undefined) space.name = name;
  if (type !== undefined) space.type = type;
  if (pricePerHour !== undefined) space.pricePerHour = pricePerHour;
  if (pricePerDay !== undefined) space.pricePerDay = pricePerDay;
  if (capacity !== undefined) space.capacity = capacity;
  if (amenities !== undefined) space.amenities = amenities;
  if (isActive !== undefined) space.isActive = isActive;

  await space.save();
  res.json(space);
};

const deleteSpace = async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) return res.status(404).json({ message: 'Space not found' });
  space.isActive = false;
  await space.save();
  res.json(space);
};

const checkAvailability = async (req, res) => {
  const { spaceId, date, startTime, endTime } = req.query;
  if (!spaceId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'spaceId, date, startTime, and endTime are required' });
  }
  if (!mongoose.Types.ObjectId.isValid(spaceId)) {
    return res.status(400).json({ message: 'Invalid spaceId' });
  }
  const conflicts = await Booking.find({
    space: spaceId,
    date: new Date(date),
    status: 'confirmed',
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }).select('startTime endTime -_id');

  res.json({ available: conflicts.length === 0, conflicts });
};

module.exports = {
  createSpace,
  getAllSpaces,
  getSpaceById,
  updateSpace,
  deleteSpace,
  checkAvailability,
};

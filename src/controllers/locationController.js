const mongoose = require('mongoose');
const Location = require('../models/Location');
const User = require('../models/User');

const createLocation = async (req, res) => {
  const { name, address, city, managedBy } = req.body;
  if (managedBy !== undefined) {
    if (typeof managedBy !== 'string' || !mongoose.Types.ObjectId.isValid(managedBy)) {
      return res.status(400).json({ message: 'Invalid managedBy user id' });
    }
    const manager = await User.findById(managedBy);
    if (!manager || manager.role !== 'location_manager') {
      return res.status(400).json({ message: 'managedBy must reference a location_manager user' });
    }
  }
  const location = await Location.create({ name, address, city, managedBy: managedBy || null });
  res.status(201).json(location);
};

const getAllLocations = async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin' && req.user.role !== 'location_manager') {
    filter.isActive = true;
  }
  const locations = await Location.find(filter);
  res.json(locations);
};

const getLocationById = async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Location not found' });
  if (!location.isActive && ['member', 'guest'].includes(req.user.role)) {
    return res.status(404).json({ message: 'Location not found' });
  }
  res.json(location);
};

const updateLocation = async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Location not found' });

  if (req.user.role === 'location_manager') {
    if (!req.user.assignedLocation || !location._id.equals(req.user.assignedLocation)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { name, address, city } = req.body;
    if (name !== undefined) location.name = name;
    if (address !== undefined) location.address = address;
    if (city !== undefined) location.city = city;
  } else {
    const { name, address, city, managedBy, isActive } = req.body;
    if (name !== undefined) location.name = name;
    if (address !== undefined) location.address = address;
    if (city !== undefined) location.city = city;
    if (isActive !== undefined) location.isActive = isActive;
    if (managedBy !== undefined) {
      if (typeof managedBy !== 'string' || !mongoose.Types.ObjectId.isValid(managedBy)) {
        return res.status(400).json({ message: 'Invalid managedBy user id' });
      }
      const manager = await User.findById(managedBy);
      if (!manager || manager.role !== 'location_manager') {
        return res.status(400).json({ message: 'managedBy must reference a location_manager user' });
      }
      location.managedBy = managedBy;
    }
  }

  await location.save();
  res.json(location);
};

const deleteLocation = async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Location not found' });
  location.isActive = false;
  await location.save();
  res.json(location);
};

const assignManager = async (req, res) => {
  const { userId } = req.body;
  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }
  const user = await User.findById(userId);
  if (!user || user.role !== 'location_manager') {
    return res.status(400).json({ message: 'userId must reference a location_manager user' });
  }
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ message: 'Location not found' });
  location.managedBy = user._id;
  user.assignedLocation = location._id;
  await location.save();
  await user.save();
  res.json(location);
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  assignManager,
};

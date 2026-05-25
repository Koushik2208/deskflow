const BillingRecord = require('../models/BillingRecord');

const getMyBilling = async (req, res) => {
  const records = await BillingRecord.find({ user: req.user._id })
    .populate('booking', 'date startTime endTime')
    .populate('location', 'name city')
    .sort({ createdAt: -1 });
  res.json(records);
};

const getAllBilling = async (req, res) => {
  const filter = {};
  if (req.user.role === 'location_manager') {
    filter.location = req.user.assignedLocation;
  }
  const records = await BillingRecord.find(filter)
    .populate('user', 'name email')
    .populate('booking', 'date startTime endTime')
    .populate('location', 'name city')
    .sort({ createdAt: -1 });
  res.json(records);
};

const getBillingById = async (req, res) => {
  const record = await BillingRecord.findById(req.params.id)
    .populate('user', 'name email')
    .populate('booking')
    .populate('location');
  if (!record) return res.status(404).json({ message: 'Billing record not found' });

  if (req.user.role === 'member' && !record.user._id.equals(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.user.role === 'location_manager' &&
      !record.location._id.equals(req.user.assignedLocation)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(record);
};

module.exports = { getMyBilling, getAllBilling, getBillingById };

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PERMISSIONS = require('../config/permissions');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
    return res.status(401).json({ message: 'Invalid token payload' });
  }
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ message: 'User no longer exists' });
  }
  req.user = user;
  next();
};

const authorize = (permission) => (req, res, next) => {
  if (!PERMISSIONS[permission] || !PERMISSIONS[permission].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = { protect, authorize };

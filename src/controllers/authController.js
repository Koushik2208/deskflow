const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GuestPass = require('../models/GuestPass');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const createUser = async (req, res, role) => {
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }
  const user = await User.create({ name, email, password, role });
  const token = signToken(user._id);
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const register = async (req, res) => createUser(req, res, 'member');

const registerAdmin = async (req, res) => createUser(req, res, 'admin');

const registerLocationManager = async (req, res) => createUser(req, res, 'location_manager');

const registerGuest = async (req, res) => {
  const { token, name, email, password } = req.body;
  if (
    typeof token !== 'string' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  const pass = await GuestPass.findOne({ token });
  if (!pass) {
    return res.status(404).json({ message: 'Guest pass not found' });
  }
  if (pass.status !== 'active') {
    return res.status(400).json({ message: 'Guest pass is not active' });
  }
  if (pass.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Guest pass has expired' });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' });
  }
  const user = await User.create({ name, email, password, role: 'guest' });
  pass.guest = user._id;
  pass.status = 'used';
  await pass.save();
  const jwtToken = signToken(user._id);
  res.status(201).json({
    token: jwtToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

module.exports = { register, registerAdmin, registerLocationManager, registerGuest, login };

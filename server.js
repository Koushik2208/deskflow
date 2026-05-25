require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');

const app = express();
app.use(express.json());

const authRoutes = require('./src/routes/authRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const spaceRoutes = require('./src/routes/spaceRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const guestPassRoutes = require('./src/routes/guestPassRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guest-passes', guestPassRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

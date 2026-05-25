const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    recurringType: { type: String, enum: ['none', 'weekly', 'monthly'], default: 'none' },
    recurringEndDate: { type: Date, default: null },
    recurringGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringBookingGroup',
      default: null,
    },
    status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
    totalAmount: { type: Number, required: true, min: 0 },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },
    guestPass: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestPass', default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ space: 1, date: 1, status: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ location: 1 });
bookingSchema.index({ recurringGroup: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

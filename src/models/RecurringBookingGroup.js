const mongoose = require('mongoose');

const recurringBookingGroupSchema = new mongoose.Schema(
  {
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    recurringType: { type: String, enum: ['weekly', 'monthly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

recurringBookingGroupSchema.index({ createdBy: 1 });
recurringBookingGroupSchema.index({ status: 1 });

module.exports = mongoose.model('RecurringBookingGroup', recurringBookingGroupSchema);

const mongoose = require('mongoose');

const billingRecordSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

billingRecordSchema.index({ user: 1 });
billingRecordSchema.index({ location: 1 });
billingRecordSchema.index({ booking: 1 });

module.exports = mongoose.model('BillingRecord', billingRecordSchema);

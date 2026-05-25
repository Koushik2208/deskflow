const mongoose = require('mongoose');
const crypto = require('crypto');

const guestPassSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'used', 'revoked', 'expired'], default: 'active' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

guestPassSchema.pre('validate', function () {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
});

guestPassSchema.index({ booking: 1 });
guestPassSchema.index({ createdBy: 1 });
guestPassSchema.index({ status: 1 });

module.exports = mongoose.model('GuestPass', guestPassSchema);

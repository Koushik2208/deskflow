const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['desk', 'meeting_room', 'private_cabin'], required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    pricePerHour: { type: Number, required: true, min: 0 },
    pricePerDay: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    amenities: { type: [String], default: [] },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

spaceSchema.index({ location: 1 });
spaceSchema.index({ type: 1 });
spaceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Space', spaceSchema);

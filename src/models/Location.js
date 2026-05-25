const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

locationSchema.index({ city: 1 });
locationSchema.index({ managedBy: 1 });
locationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Location', locationSchema);

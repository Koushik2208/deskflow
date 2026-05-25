const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, space: 1 }, { unique: true });
reviewSchema.index({ space: 1 });

reviewSchema.statics.recalcSpaceRatings = async function (spaceId) {
  const result = await this.aggregate([
    { $match: { space: spaceId } },
    { $group: { _id: '$space', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const Space = mongoose.model('Space');
  if (result.length > 0) {
    await Space.findByIdAndUpdate(spaceId, {
      ratings: Math.round(result[0].avgRating * 10) / 10,
      numReviews: result[0].count,
    });
  } else {
    await Space.findByIdAndUpdate(spaceId, { ratings: 0, numReviews: 0 });
  }
};

reviewSchema.post('save', async function () {
  await mongoose.model('Review').recalcSpaceRatings(this.space);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await mongoose.model('Review').recalcSpaceRatings(doc.space);
  }
});

module.exports = mongoose.model('Review', reviewSchema);

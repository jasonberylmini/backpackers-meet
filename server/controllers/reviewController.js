import Review from '../models/Review.js';

export const giveReview = async (req, res) => {
  try {
    const { reviewedUser, tripId, rating, comment } = req.body;
    const reviewer = req.user.userId;

    if (!reviewedUser || !tripId || !rating) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newReview = new Review({
      reviewer,
      reviewedUser,
      tripId,
      rating,
      comment,
    });

    await newReview.save();

    res.status(201).json({ message: "Review submitted.", review: newReview });
  } catch (err) {
    console.error("❌ Review Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUser: userId })
      .populate('reviewer', 'name email')
      .populate('tripId', 'destination date');

    res.status(200).json(reviews);
  } catch (err) {
    console.error("❌ Fetch Reviews Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

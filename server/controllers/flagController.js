import Flag, { USER_REASONS, TRIP_REASONS, REVIEW_REASONS } from '../models/Flag.js';

export const submitFlag = async (req, res) => {
  try {
    const { flagType, targetId, reason } = req.body;
    if (!['user', 'trip', 'review'].includes(flagType)) {
      return res.status(400).json({ message: 'Invalid flag type.' });
    }
    let validReasons = [];
    if (flagType === 'user') validReasons = USER_REASONS;
    if (flagType === 'trip') validReasons = TRIP_REASONS;
    if (flagType === 'review') validReasons = REVIEW_REASONS;
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Invalid reason for this flag type.' });
    }
    const flag = new Flag({
      flaggedBy: req.user.userId,
      flagType,
      targetId,
      reason
    });
    await flag.save();
    res.status(201).json({ message: 'Flag submitted.', flag });
  } catch (err) {
    console.error('❌ Submit Flag Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllFlags = async (req, res) => {
  try {
    const flags = await Flag.find()
      .populate('flaggedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(flags);
  } catch (err) {
    console.error('❌ Fetch Flags Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

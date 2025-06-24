import Flag from '../models/Flag.js';

export const submitFlag = async (req, res) => {
  try {
    const { type, targetId, reason } = req.body;

    if (!['user', 'review'].includes(type)) {
      return res.status(400).json({ message: 'Invalid flag type.' });
    }

    const flag = new Flag({
      flaggedBy: req.user.userId,
      type,
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

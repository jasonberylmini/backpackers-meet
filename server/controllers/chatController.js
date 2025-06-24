import Message from '../models/Message.js';

export const sendMessage = async (req, res) => {
  try {
    const { tripId, text } = req.body;
    const sender = req.user.userId;

    if (!tripId || !text) {
      return res.status(400).json({ message: 'Trip and text are required.' });
    }

    const message = new Message({
      tripId,
      sender,
      text
    });

    await message.save();
    res.status(201).json({ message: 'Message sent.', chat: message });
  } catch (err) {
    console.error('❌ Send Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTripMessages = async (req, res) => {
  try {
    const { tripId } = req.params;

    const messages = await Message.find({ tripId })
      .populate('sender', 'name email')
      .sort({ sentAt: 1 }); // sort oldest to newest

    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ Fetch Chat Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

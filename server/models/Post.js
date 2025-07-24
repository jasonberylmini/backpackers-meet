import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audience: { type: String, enum: ['worldwide', 'nearby'], default: 'worldwide' },
  content: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  country: { type: String, default: '' },
});

const Post = mongoose.model('Post', postSchema);
export default Post; 
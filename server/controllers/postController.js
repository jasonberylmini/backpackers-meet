import Post from '../models/Post.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Flag from '../models/Flag.js';

export const createPost = async (req, res) => {
  try {
    const { content, audience } = req.body;
    // Fetch user and check KYC
    const user = await User.findById(req.user.userId);
    if (!user || user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'KYC verification required to create posts.' });
    }
    if (!content || content.length > 500) {
      return res.status(400).json({ message: 'Content is required and must be 500 characters or less.' });
    }
    if (!audience || !['worldwide', 'nearby'].includes(audience)) {
      return res.status(400).json({ message: 'Audience must be either "worldwide" or "nearby".' });
    }
    let country = '';
    if (audience === 'nearby') {
      if (!user.country) {
        return res.status(400).json({ message: 'User country required for nearby posts.' });
      }
      country = user.country;
    }
    const post = new Post({
      author: req.user.userId,
      content,
      audience,
      country
    });
    await post.save();
    res.status(201).json({ message: 'Post created!', post });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, audience } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (!post.author.equals(req.user.userId)) {
      return res.status(403).json({ message: 'You can only edit your own posts.' });
    }
    if (content !== undefined) {
      if (!content || content.length > 500) {
        return res.status(400).json({ message: 'Content is required and must be 500 characters or less.' });
      }
      post.content = content;
    }
    if (audience !== undefined) {
      if (!['worldwide', 'nearby'].includes(audience)) {
        return res.status(400).json({ message: 'Audience must be either "worldwide" or "nearby".' });
      }
      post.audience = audience;
    }
    await post.save();
    res.status(200).json({ message: 'Post updated!', post });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (!post.author.equals(req.user.userId)) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }
    await post.deleteOne();
    res.status(200).json({ message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const { audience } = req.query;
    let filter = {};
    if (audience === 'nearby') {
      const user = await User.findById(req.user.userId);
      if (!user || !user.country) {
        return res.status(400).json({ message: 'User country required for nearby feed.' });
      }
      filter = { audience: 'nearby', country: user.country };
    } else if (audience === 'worldwide') {
      filter = { audience: 'worldwide' };
    }
    const posts = await Post.find(filter)
      .populate('author', 'name profileImage country')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ author: userId })
      .populate('author', 'name profileImage country')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const liked = post.likes.includes(userId);
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    res.status(200).json({
      message: liked ? 'Post unliked.' : 'Post liked.',
      likesCount: post.likes.length,
      liked: !liked
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content || content.length > 500) {
      return res.status(400).json({ message: 'Comment content is required and must be 500 characters or less.' });
    }
    const user = await User.findById(req.user.userId);
    if (!user || user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'KYC verification required to comment.' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const comment = new Comment({
      post: postId,
      author: req.user.userId,
      content
    });
    await comment.save();
    post.comments.push(comment._id);
    await post.save();
    await comment.populate('author', 'name profileImage country');
    res.status(201).json({ message: 'Comment added!', comment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .populate('author', 'name profileImage country')
      .sort({ createdAt: -1 });
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });
    if (!comment.author.equals(req.user.userId)) {
      return res.status(403).json({ message: 'You can only edit your own comments.' });
    }
    if (!content || content.length > 500) {
      return res.status(400).json({ message: 'Content is required and must be 500 characters or less.' });
    }
    comment.content = content;
    await comment.save();
    res.status(200).json({ message: 'Comment updated!', comment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });
    if (!comment.author.equals(req.user.userId)) {
      return res.status(403).json({ message: 'You can only delete your own comments.' });
    }
    // Remove comment from post.comments array
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    await comment.deleteOne();
    res.status(200).json({ message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required.' });
    const user = await User.findById(req.user.userId);
    if (!user || user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'KYC verification required to report.' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const flag = new Flag({
      flaggedBy: req.user.userId,
      flagType: 'post',
      targetId: postId,
      reason
    });
    await flag.save();
    res.status(201).json({ message: 'Post reported.', flag });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 
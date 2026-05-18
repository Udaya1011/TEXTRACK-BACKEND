import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Login
router.post('/login', async (req, res) => {
  console.log('Login attempt:', req.body);
  const { mobile, password } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      console.log('User not found by mobile');
      return res.status(401).json({ message: 'Invalid mobile or password' });
    }
    if (!user.active) return res.status(403).json({ message: 'Account disabled by admin' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'Invalid mobile or password' });
    }
    console.log('Login successful');
    res.json({
      _id: user._id, name: user.name, mobile: user.mobile,
      role: user.role, token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create user
router.post('/create-user', protect, adminOnly, async (req, res) => {
  const { name, mobile, password, role } = req.body;
  try {
    const exists = await User.findOne({ mobile });
    if (exists) return res.status(400).json({ message: 'Mobile already registered' });
    const user = await User.create({ name, mobile, password, role: role || 'user' });
    res.status(201).json({ _id: user._id, name: user.name, mobile: user.mobile, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Toggle user active
router.patch('/users/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.active = !user.active;
    await user.save();
    res.json({ message: `User ${user.active ? 'activated' : 'deactivated'}`, active: user.active });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get self
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

export default router;

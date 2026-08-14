import { Router } from 'express';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const normalizedEmail = email.toLowerCase().trim();

  if (role === 'super_admin') {
    const existingSuperAdmin = await User.countDocuments({ role: 'super_admin' });
    if (existingSuperAdmin > 0) {
      return res.status(403).json({ error: 'A super_admin account already exists' });
    }
  }

  if (role === 'admin') {
    const existingSuperAdmin = await User.countDocuments({ role: 'super_admin' });
    if (existingSuperAdmin === 0) {
      return res.status(403).json({ error: 'Cannot register admin before super_admin exists' });
    }
  }

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const user = new User({
      email: normalizedEmail,
      password,
      fullName: fullName || '',
      role: role || 'member',
      status: 'active',
    });
    await user.save();
    const token = signToken(user);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account blocked' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.json({ user: null });
  try {
    const jwt = (await import('jsonwebtoken')).default;
    const JWT_SECRET = process.env.JWT_SECRET || 'taskhub-secret-key-change-in-production';
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.json({ user: null });
    res.json({ user: user.toJSON() });
  } catch {
    res.json({ user: null });
  }
});

export default router;

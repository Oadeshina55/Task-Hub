import { Router } from 'express';
import User from '../models/User.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Get all users (admin+)
router.get('/', requirePermission('users.view'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  res.json(req.user.toJSON());
});

// Update own profile
router.patch('/me', async (req, res) => {
  const { fullName, profilePicture } = req.body;
  try {
    if (fullName !== undefined) req.user.fullName = fullName;
    if (profilePicture !== undefined) req.user.profilePicture = profilePicture;
    const oldValue = req.user.toObject();
    await req.user.save();
    const AuditLog = (await import('../models/AuditLog.js')).default;
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Updated profile',
      targetType: 'user',
      targetId: req.user._id,
      oldValue,
      newValue: req.user.toObject(),
    });
    await audit.save();
    res.json(req.user.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update own password
router.patch('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  try {
    const valid = await req.user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    req.user.password = newPassword;
    await req.user.save();
    const AuditLog = (await import('../models/AuditLog.js')).default;
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Changed password',
      targetType: 'user',
      targetId: req.user._id,
    });
    await audit.save();
    res.json({ success: true, user: req.user.toJSON() });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Create new user
router.post('/', requirePermission('users.create'), async (req, res) => {
  const { email, password, fullName, role, department, profilePicture } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName || '',
      role: role || 'member',
      department: department || '',
      profilePicture: profilePicture || '',
    });
    await user.save();
    res.status(201).json(user.toJSON());
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.patch('/:id', requirePermission('users.update'), async (req, res) => {
  const { fullName, role, status, profilePicture, department } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (department !== undefined) user.department = department;
    await user.save();
    res.json(user.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Block/unblock user
router.patch('/:id/status', requirePermission('users.update'), async (req, res) => {
  const { status } = req.body;
  if (!['active', 'blocked'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = status;
    await user.save();
    res.json(user.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete user
router.delete('/:id', requirePermission('users.delete'), async (req, res) => {
  try {
    if (req.params.id === String(req.user._id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

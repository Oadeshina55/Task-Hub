import { Router } from 'express';
import Leave from '../models/Leave.js';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Create leave request (members and above)
router.post('/', requirePermission('leaves.create'), async (req, res) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Start and end date required' });
  try {
    const leave = new Leave({ user: req.user._id, startDate, endDate, reason: reason || '' });
    await leave.save();
    const audit = new AuditLog({ actor: req.user._id, action: 'Requested leave', targetType: 'leave', targetId: leave._id, newValue: leave.toObject() });
    await audit.save();
    res.status(201).json(leave.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// Get leaves (admins/managers see all; members see their own)
router.get('/', async (req, res) => {
  try {
    const canViewAll = (req.user.role === 'super_admin' || req.user.role === 'admin' || req.user.role === 'manager');
    const filter = canViewAll ? {} : { user: req.user._id };
    const leaves = await Leave.find(filter).sort({ createdAt: -1 }).populate('user', 'fullName email');
    res.json(leaves);
  } catch {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// Approve or reject (super_admin only)
router.patch('/:id', requirePermission('leaves.approve'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    // once decided, a leave cannot be reversed
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Leave request has already been processed and cannot be changed' });
    leave.status = status;
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date().toISOString();
    await leave.save();
    const audit = new AuditLog({ actor: req.user._id, action: `Leave ${status}`, targetType: 'leave', targetId: leave._id, newValue: leave.toObject() });
    await audit.save();
    res.json(leave.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

export default router;

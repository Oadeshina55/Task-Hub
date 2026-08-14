import express from 'express';
import Voucher from '../models/Voucher.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create voucher (staff)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: 'Valid amount is required' });
    const voucher = await Voucher.create({
      requesterId: req.user._id,
      requesterName: req.user.fullName || req.user.email,
      department: req.user.department || '',
      amount: Number(amount),
      reason: reason || '',
      currency: 'NGN',
    });
    return res.json(voucher);
  } catch (err) {
    console.error('Voucher create error:', err);
    return res.status(500).json({ error: err?.message || 'Could not create voucher' });
  }
});

// List vouchers - finance/admin can see all, others see own
router.get('/', authMiddleware, async (req, res) => {
  try {
    let items;
    if (req.user.role === 'super_admin' || req.user.role === 'admin' || req.user.role === 'manager') {
      items = await Voucher.find().sort({ createdAt: -1 });
    } else {
      items = await Voucher.find({ requesterId: req.user._id }).sort({ createdAt: -1 });
    }
    return res.json(items);
  } catch (err) {
    console.error('Voucher list error:', err);
    return res.status(500).json({ error: err?.message || 'Could not fetch vouchers' });
  }
});

// Get single voucher
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const v = await Voucher.findById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Not found' });
    if (v.requesterId.toString() !== req.user._id.toString() && !(req.user.role === 'super_admin' || req.user.role === 'admin' || req.user.role === 'manager')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return res.json(v);
  } catch (err) {
    console.error('Voucher get error:', err);
    return res.status(500).json({ error: err?.message || 'Could not fetch voucher' });
  }
});

// Update voucher status or add comment - only finance/admin/manager
router.patch('/:id', authMiddleware, requireRole('admin', 'super_admin', 'manager'), async (req, res) => {
  try {
    const { status, comment } = req.body;
    const v = await Voucher.findById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Not found' });
    if (status && ['pending', 'approved', 'declined', 'questioned'].includes(status)) {
      v.status = status;
      v.approverId = req.user._id;
      v.approverName = req.user.fullName || req.user.email;
    }
    if (comment) v.comments = v.comments.concat(String(comment));
    await v.save();
    return res.json(v);
  } catch (err) {
    console.error('Voucher update error:', err);
    return res.status(500).json({ error: err?.message || 'Could not update voucher' });
  }
});

export default router;

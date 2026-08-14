import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('audit_logs.view'), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('actor', 'fullName email');
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;

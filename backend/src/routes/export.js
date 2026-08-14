import { Router } from 'express';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import Voucher from '../models/Voucher.js';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

function toCSV(rows: any[], headers: string[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(','));
  }
  return lines.join('\n');
}

router.get('/:resource', authMiddleware, requireRole('admin', 'super_admin', 'manager'), async (req, res) => {
  try {
    const { resource } = req.params;
    let rows = [];
    let headers = [];
    switch (resource) {
      case 'users': {
        const items = await User.find().lean();
        headers = ['id', 'email', 'fullName', 'role', 'department', 'status', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, email: i.email, fullName: i.fullName, role: i.role, department: i.department, status: i.status, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'tasks': {
        const items = await Task.find().lean();
        headers = ['id', 'title', 'project', 'assignedTo', 'assignedToId', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, title: i.title, project: i.project, assignedTo: i.assignedTo, assignedToId: i.assignedToId, status: i.status, priority: i.priority, dueDate: i.dueDate, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'projects': {
        const items = await Project.find().lean();
        headers = ['id', 'name', 'description', 'manager', 'status', 'startDate', 'endDate', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, name: i.name, description: i.description, manager: i.manager, status: i.status, startDate: i.startDate, endDate: i.endDate, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'departments': {
        const items = await Department.find().lean();
        headers = ['id', 'name', 'description', 'head', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, name: i.name, description: i.description, head: i.head, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'leaves': {
        const items = await Leave.find().lean();
        headers = ['id', 'user', 'startDate', 'endDate', 'reason', 'status', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, user: i.user, startDate: i.startDate, endDate: i.endDate, reason: i.reason, status: i.status, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'vouchers': {
        const items = await Voucher.find().lean();
        headers = ['id', 'requesterId', 'requesterName', 'department', 'amount', 'currency', 'reason', 'status', 'approverId', 'approverName', 'createdAt', 'updatedAt'];
        rows = items.map((i) => ({ id: i._id, requesterId: i.requesterId, requesterName: i.requesterName, department: i.department, amount: i.amount, currency: i.currency, reason: i.reason, status: i.status, approverId: i.approverId, approverName: i.approverName, createdAt: i.createdAt, updatedAt: i.updatedAt }));
        break;
      }
      case 'audit': {
        const items = await AuditLog.find().lean();
        headers = ['id', 'actorId', 'actorName', 'action', 'targetType', 'targetId', 'createdAt'];
        rows = items.map((i) => ({ id: i._id, actorId: i.actor?.id || '', actorName: i.actor?.fullName || '', action: i.action, targetType: i.targetType, targetId: i.targetId, createdAt: i.createdAt }));
        break;
      }
      default:
        return res.status(400).json({ error: 'Unknown resource' });
    }

    const csv = toCSV(rows, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${resource}.csv"`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: 'Export failed' });
  }
});

export default router;

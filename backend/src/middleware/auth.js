import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taskhub-secret-key-change-in-production';

const ROLE_PERMISSIONS = {
  super_admin: [
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'projects.view',
    'projects.create',
    'projects.update',
    'projects.delete',
    'projects.assign',
    'tasks.view',
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.assign',
    'tasks.approve',
    'departments.view',
    'departments.create',
    'departments.update',
    'departments.delete',
    'reports.view',
    'reports.export',
    'audit_logs.view',
    'settings.view',
    'settings.update',
    'leaves.view',
    'leaves.create',
    'leaves.approve',
  ],
  admin: [
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'projects.view',
    'projects.create',
    'projects.update',
    'projects.delete',
    'projects.assign',
    'tasks.view',
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.assign',
    'tasks.approve',
    'departments.view',
    'departments.create',
    'departments.update',
    'departments.delete',
    'reports.view',
    'reports.export',
    'audit_logs.view',
    'settings.view',
    'settings.update',
    'leaves.view',
    'leaves.create',
  ],
  manager: [
    'users.view',
    'projects.view',
    'projects.create',
    'projects.update',
    'projects.assign',
    'tasks.view',
    'tasks.create',
    'tasks.update',
    'tasks.assign',
    'tasks.approve',
    'departments.view',
    'reports.view',
    'notifications.view',
    'leaves.view',
    'leaves.create',
  ],
  member: [
    'tasks.view',
    'tasks.create',
    'tasks.update',
    'projects.view',
    'notifications.view',
    'leaves.create',
    'leaves.view',
  ],
};

export function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account blocked' });
    req.user = user;
    req.user.permissions = ROLE_PERMISSIONS[user.role] || [];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

import { Router } from 'express';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('tasks.view'), async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/', requirePermission('tasks.create'), async (req, res) => {
  const {
    title,
    project,
    priority,
    status,
    dueDate,
    label,
    assignedTo,
    assignedToId,
    projectId,
    description,
    progress,
    score,
  } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required' });
  if (!projectId) return res.status(400).json({ error: 'Task must belong to a project (projectId required)' });
  try {
    // If only an assignedToId was provided, resolve the user's display name
    let resolvedAssignedTo = assignedTo || '';
    if ((!resolvedAssignedTo || resolvedAssignedTo === '') && assignedToId) {
      try {
        const User = (await import('../models/User.js')).default;
        const u = await User.findById(assignedToId);
        if (u) resolvedAssignedTo = u.fullName || u.email;
      } catch (err) {
        // ignore resolution errors and fall back to empty string
      }
    }

    let resolvedProject = project || '';
    if ((!resolvedProject || resolvedProject === '') && projectId) {
      try {
        const Project = (await import('../models/Project.js')).default;
        const p = await Project.findById(projectId);
        if (p) resolvedProject = p.name;
      } catch (err) {
        // ignore resolution errors and fall back to provided project name
      }
    }

    const task = new Task({
      title,
      project: resolvedProject,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate: dueDate || '',
      startDate: req.body.startDate || '',
      label: label || '',
      assignedTo: resolvedAssignedTo,
      assignedToId: assignedToId || null,
      projectId: projectId || null,
      description: description || '',
      progress: typeof progress === 'number' ? progress : 0,
      score: typeof score === 'number' ? score : 0,
      createdBy: req.user._id,
    });
    await task.save();
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Created task',
      targetType: 'task',
      targetId: task._id,
      newValue: task.toObject(),
    });
    await audit.save();
    res.status(201).json(task.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', requirePermission('tasks.update'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const canAssign = ['super_admin', 'admin', 'manager'].includes(req.user.role);
    if ((req.body.assignedTo !== undefined || req.body.assignedToId !== undefined) && !canAssign) {
      return res.status(403).json({ error: 'Only admins and managers can assign tasks' });
    }

    if (req.body.verifiedCompletion !== undefined && !canAssign) {
      return res.status(403).json({ error: 'Only admins and managers can verify completion' });
    }

    const isMember = req.user.role === 'member';
    const isAssignedToCurrentUser = task.assignedToId && task.assignedToId.toString() === req.user._id.toString();
    const isAssignedByName = task.assignedTo && (task.assignedTo === req.user.fullName || task.assignedTo === req.user.email);
    const isTaskAssignee = isAssignedToCurrentUser || isAssignedByName;

    if (isMember) {
      if (!isTaskAssignee) {
        return res.status(403).json({ error: 'Staff may only update tasks assigned to them' });
      }
      const unauthorizedFields = Object.keys(req.body).filter((field) => field !== 'progress' && field !== 'status');
      if (unauthorizedFields.length > 0) {
        return res.status(403).json({ error: 'Staff can only update task status and progress' });
      }
    }

    if (req.body.assignedToId !== undefined) {
      if (req.body.assignedToId === null || req.body.assignedToId === '') {
        req.body.assignedTo = '';
      } else {
        try {
          const User = (await import('../models/User.js')).default;
          const u = await User.findById(req.body.assignedToId);
          if (u) {
            req.body.assignedTo = u.fullName || u.email;
            req.body.assignedToId = u._id;
          }
        } catch (err) {
          // leave assignedTo as provided (or undefined) on error
        }
      }
    }

    const statusUpdate = req.body.status !== undefined ? req.body.status : task.status;
    if (statusUpdate !== 'done') {
      req.body.verifiedCompletion = false;
    } else if (req.body.verifiedCompletion === undefined && task.status !== 'done') {
      req.body.verifiedCompletion = false;
    }

    const oldTask = task.toObject();
    const updatable = [
      'title',
      'description',
      'status',
      'priority',
      'project',
      'projectId',
      'assignedTo',
      'assignedToId',
      'dueDate',
      'label',
      'progress',
      'score',
      'dueDateCompleted',
      'verifiedCompletion',
    ];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
    await task.save();
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Updated task',
      targetType: 'task',
      targetId: task._id,
      oldValue: oldTask,
      newValue: task.toObject(),
    });
    await audit.save();
    res.json(task.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.post('/:id/comments', requirePermission('tasks.update'), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const comment = new Comment({
      text,
      author: req.user._id,
      targetType: 'task',
      targetId: task._id,
    });
    await comment.save();
    task.comments.push(comment._id);
    await task.save();
    // populate author before returning so frontend can show commenter's name
    await comment.populate('author', 'fullName email');
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Added task comment',
      targetType: 'task',
      targetId: task._id,
      newValue: { comment: comment.toObject() },
    });
    await audit.save();
    res.status(201).json(comment.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/:id/comments', requirePermission('tasks.view'), async (req, res) => {
  try {
    const comments = await Comment.find({ targetType: 'task', targetId: req.params.id }).sort({ createdAt: -1 }).populate('author', 'fullName email');
    res.json(comments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.delete('/:id', requirePermission('tasks.delete'), async (req, res) => {
  try {
    const result = await Task.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

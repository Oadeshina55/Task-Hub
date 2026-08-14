import { Router } from 'express';
import Project from '../models/Project.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('projects.view'), async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/:id', requirePermission('projects.view'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.post('/', requirePermission('projects.create'), async (req, res) => {
  const {
    name,
    description,
    color,
    client,
    department,
    status,
    priority,
    budget,
    startDate,
    endDate,
    manager,
    members,
  } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  try {
    const project = new Project({
      name,
      description: description || '',
      color: color || 'coral',
      client: client || '',
      department: department || '',
      status: status || 'draft',
      priority: priority || 'medium',
      budget: typeof budget === 'number' ? budget : 0,
      startDate: startDate || '',
      endDate: endDate || '',
      manager: manager || '',
      members: Array.isArray(members) ? members : [],
      createdBy: req.user._id,
    });
    await project.save();
    res.status(201).json(project.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.patch('/:id', requirePermission('projects.update'), async (req, res) => {
  const {
    name,
    description,
    color,
    client,
    department,
    status,
    priority,
    budget,
    startDate,
    endDate,
    manager,
    members,
  } = req.body;
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const oldProject = project.toObject();
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (color !== undefined) project.color = color;
    if (client !== undefined) project.client = client;
    if (department !== undefined) project.department = department;
    if (status !== undefined) project.status = status;
    if (priority !== undefined) project.priority = priority;
    if (budget !== undefined) project.budget = budget;
    if (startDate !== undefined) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (manager !== undefined) project.manager = manager;
    if (members !== undefined) project.members = Array.isArray(members) ? members : project.members;
    await project.save();
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Updated project',
      targetType: 'project',
      targetId: project._id,
      oldValue: oldProject,
      newValue: project.toObject(),
    });
    await audit.save();
    res.json(project.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.post('/:id/comments', requirePermission('projects.view'), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const comment = new Comment({
      text,
      author: req.user._id,
      targetType: 'project',
      targetId: project._id,
    });
    await comment.save();
    project.comments.push(comment._id);
    await project.save();
    // populate author before returning so frontend has display name and email
    await comment.populate('author', 'fullName email');
    const audit = new AuditLog({
      actor: req.user._id,
      action: 'Added project comment',
      targetType: 'project',
      targetId: project._id,
      newValue: { comment: comment.toObject() },
    });
    await audit.save();
    res.status(201).json(comment.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to add project comment' });
  }
});

router.get('/:id/comments', requirePermission('projects.view'), async (req, res) => {
  try {
    const comments = await Comment.find({ targetType: 'project', targetId: req.params.id }).sort({ createdAt: -1 }).populate('author', 'fullName email');
    res.json(comments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch project comments' });
  }
});

router.delete('/:id', requirePermission('projects.delete'), async (req, res) => {
  try {
    const result = await Project.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;

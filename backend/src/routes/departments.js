import { Router } from 'express';
import Department from '../models/Department.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('departments.view'), async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).populate('head', 'fullName email');
    res.json(departments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/', requirePermission('departments.create'), async (req, res) => {
  const { name, description, head, members } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name required' });
  try {
    const department = new Department({
      name,
      description: description || '',
      head: head || null,
      members: members || [],
      createdBy: req.user._id,
    });
    await department.save();
    res.status(201).json(department.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.patch('/:id', requirePermission('departments.update'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    const { name, description, head, members } = req.body;
    if (name !== undefined) department.name = name;
    if (description !== undefined) department.description = description;
    if (head !== undefined) department.head = head;
    if (members !== undefined) department.members = members;
    await department.save();
    res.json(department.toJSON());
  } catch {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', requirePermission('departments.delete'), async (req, res) => {
  try {
    const result = await Department.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Department not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;

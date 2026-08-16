import { Router } from 'express';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Voucher from '../models/Voucher.js';
import { connectDB } from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    await connectDB();
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Voucher.deleteMany({});

    // Create super admin
    const admin = new User({
      email: 'admin@taskhub.com',
      password: 'Admin123!',
      fullName: 'Super Admin',
      role: 'super_admin',
      status: 'active',
    });
    await admin.save();

    // Create a manager
    const manager = new User({
      email: 'manager@taskhub.com',
      password: 'Manager123!',
      fullName: 'Sarah Lee',
      role: 'manager',
      status: 'active',
    });
    await manager.save();

    // Create a member
    const member = new User({
      email: 'member@taskhub.com',
      password: 'Member123!',
      fullName: 'John Doe',
      role: 'member',
      status: 'active',
    });
    await member.save();

    // Create projects
    const p1 = new Project({ name: 'Website redesign', description: 'Revamp the main website', color: 'coral', createdBy: admin._id });
    await p1.save();
    const p2 = new Project({ name: 'Mobile app', description: 'Build the mobile companion app', color: 'blue', createdBy: admin._id });
    await p2.save();
    const p3 = new Project({ name: 'Research sprint', description: 'User research and testing', color: 'sage', createdBy: admin._id });
    await p3.save();

    // Create tasks
    const tasks = [
      { title: 'Finalize Q4 launch brief', project: 'Website redesign', status: 'progress', priority: 'high', dueDate: 'Today', assignedTo: 'AM', label: 'Strategy', createdBy: admin._id },
      { title: 'Review onboarding flows', project: 'Mobile app', status: 'todo', priority: 'medium', dueDate: 'Tomorrow', assignedTo: 'JK', label: 'Design', createdBy: manager._id },
      { title: 'Prepare customer interview guide', project: 'Research sprint', status: 'todo', priority: 'low', dueDate: 'Oct 28', assignedTo: 'SL', label: 'Research', createdBy: manager._id },
      { title: 'Publish release notes', project: 'Website redesign', status: 'done', priority: 'medium', dueDate: 'Oct 24', assignedTo: 'AM', label: 'Content', createdBy: admin._id },
      { title: 'Audit analytics events', project: 'Mobile app', status: 'progress', priority: 'high', dueDate: 'Oct 29', assignedTo: 'DN', label: 'Engineering', createdBy: admin._id },
      { title: 'Share updated user personas', project: 'Research sprint', status: 'done', priority: 'low', dueDate: 'Oct 25', assignedTo: 'SL', label: 'Research', createdBy: manager._id },
      { title: 'Set up team retro', project: 'Website redesign', status: 'todo', priority: 'low', dueDate: 'Nov 01', assignedTo: 'JK', label: 'Team', createdBy: admin._id },
    ];
    // Use individual saves so `pre('save')` hooks run and generate unique taskCode
    console.log('Seeding tasks, count=', tasks.length);
    for (const t of tasks) {
      if (!t.taskCode) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        t.taskCode = `TASK-${timestamp}-${randomPart}`;
      }
      console.log('Saving task with taskCode=', t.taskCode);
      const taskDoc = new Task(t);
      await taskDoc.save();
      console.log('Saved task id=', taskDoc._id, 'code=', taskDoc.taskCode);
    }
      // sample vouchers
      const memberUser = await User.findOne({ role: 'member' });
      const managerUser = await User.findOne({ role: 'manager' });
      const adminUser = await User.findOne({ role: 'super_admin' });
      if (memberUser) await Voucher.create({ requesterId: memberUser._id, requesterName: memberUser.fullName || memberUser.email, department: memberUser.department || '', amount: 5000, currency: 'NGN', reason: 'Taxi reimbursement', status: 'pending' });
      if (managerUser && adminUser) await Voucher.create({ requesterId: managerUser._id, requesterName: managerUser.fullName || managerUser.email, department: managerUser.department || '', amount: 20000, currency: 'NGN', reason: 'Conference fee', status: 'approved', approverId: adminUser._id, approverName: adminUser.fullName || adminUser.email });

    res.json({ success: true, message: 'Database seeded with 3 users, 3 projects, 7 tasks, sample vouchers' });
  } catch (err) {
    res.status(500).json({ error: 'Seed failed', detail: err.message });
  }
});

export default router;

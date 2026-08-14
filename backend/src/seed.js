import { connectDB } from './db.js';
import User from './models/User.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import Department from './models/Department.js';
import Leave from './models/Leave.js';
import Voucher from './models/Voucher.js';

async function seed() {
  await connectDB();
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  await Department.deleteMany({});
  await Leave.deleteMany({});
  await Voucher.deleteMany({});

  const admin = new User({ email: 'admin@taskhub.com', password: 'Admin123!', fullName: 'Super Admin', role: 'super_admin' });
  await admin.save();

  const manager = new User({ email: 'manager@taskhub.com', password: 'Manager123!', fullName: 'Sarah Lee', role: 'manager', department: 'Product' });
  await manager.save();

  const member = new User({ email: 'member@taskhub.com', password: 'Member123!', fullName: 'John Doe', role: 'member', department: 'Engineering' });
  await member.save();

  const p1 = new Project({ name: 'Website redesign', description: 'Revamp the main website', color: 'coral', createdBy: admin._id });
  await p1.save();
  const p2 = new Project({ name: 'Mobile app', description: 'Build the mobile companion app', color: 'blue', createdBy: admin._id });
  await p2.save();
  const p3 = new Project({ name: 'Research sprint', description: 'User research and testing', color: 'sage', createdBy: admin._id });
  await p3.save();

  // Create some departments
  const d1 = new Department({ name: 'Engineering', description: 'Engineering team', head: manager._id, members: [member._id], createdBy: admin._id });
  await d1.save();
  const d2 = new Department({ name: 'Product', description: 'Product team', head: manager._id, members: [], createdBy: admin._id });
  await d2.save();
  const d3 = new Department({ name: 'HR', description: 'Human resources', head: admin._id, members: [], createdBy: admin._id });
  await d3.save();

  const tasks = [
    { title: 'Finalize Q4 launch brief', project: 'Website redesign', status: 'progress', priority: 'high', dueDate: 'Today', assignedTo: 'AM', label: 'Strategy', createdBy: admin._id },
    { title: 'Review onboarding flows', project: 'Mobile app', status: 'todo', priority: 'medium', dueDate: 'Tomorrow', assignedTo: 'JK', label: 'Design', createdBy: manager._id },
    { title: 'Prepare customer interview guide', project: 'Research sprint', status: 'todo', priority: 'low', dueDate: 'Oct 28', assignedTo: 'SL', label: 'Research', createdBy: manager._id },
    { title: 'Publish release notes', project: 'Website redesign', status: 'done', priority: 'medium', dueDate: 'Oct 24', assignedTo: 'AM', label: 'Content', createdBy: admin._id },
    { title: 'Audit analytics events', project: 'Mobile app', status: 'progress', priority: 'high', dueDate: 'Oct 29', assignedTo: 'DN', label: 'Engineering', createdBy: admin._id },
    { title: 'Share updated user personas', project: 'Research sprint', status: 'done', priority: 'low', dueDate: 'Oct 25', assignedTo: 'SL', label: 'Research', createdBy: manager._id },
    { title: 'Set up team retro', project: 'Website redesign', status: 'todo', priority: 'low', dueDate: 'Nov 01', assignedTo: 'JK', label: 'Team', createdBy: admin._id },
  ];
  for (const t of tasks) {
    const taskDoc = new Task(t);
    await taskDoc.save();
  }

  // Create a sample leave request for the member
  const leave = new Leave({ user: member._id, startDate: '2026-09-01', endDate: '2026-09-05', reason: 'Annual leave' });
  await leave.save();

  // Create sample vouchers
  const v1 = new Voucher({ requesterId: member._id, requesterName: member.fullName, department: member.department, amount: 5000, currency: 'NGN', reason: 'Taxi reimbursement', status: 'pending' });
  await v1.save();
  const v2 = new Voucher({ requesterId: manager._id, requesterName: manager.fullName, department: manager.department, amount: 20000, currency: 'NGN', reason: 'Conference fee', status: 'approved', approverId: admin._id, approverName: admin.fullName });
  await v2.save();

  console.log('Seed complete: 3 users, 3 projects, 7 tasks, 3 departments, 1 leave, 2 vouchers');
  console.log('  admin@taskhub.com / Admin123!  (super_admin)');
  console.log('  manager@taskhub.com / Manager123!  (manager)');
  console.log('  member@taskhub.com / Member123!  (member)');
  process.exit(0);
}

seed();

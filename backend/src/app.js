import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import departmentRoutes from './routes/departments.js';
import auditRoutes from './routes/audit.js';
import seedRoutes from './routes/seed.js';
import leavesRoutes from './routes/leaves.js';
import exportRoutes from './routes/export.js';
import vouchersRoutes from './routes/vouchers.js';

const app = express();

app.use(cors());
// Allow larger payloads (base64 images for profile avatars)
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/departments', departmentRoutes);
app.use('/audit', auditRoutes);
app.use('/seed', seedRoutes);
app.use('/leaves', leavesRoutes);
app.use('/vouchers', vouchersRoutes);
app.use('/export', exportRoutes);

export { app, connectDB };

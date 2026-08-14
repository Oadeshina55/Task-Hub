import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    taskCode: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    project: { type: String, default: 'General' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    taskType: { type: String, default: '' },
    status: { type: String, enum: ['backlog', 'todo', 'progress', 'blocked', 'review', 'done', 'cancelled'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    assignedTo: { type: String, default: '' },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewer: { type: String, default: '' },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startDate: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    estimatedHours: { type: Number, default: 0 },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    progress: { type: Number, min: 0, max: 100, default: 0 },
    score: { type: Number, min: 0, max: 100, default: 0 },
    attachments: [{ type: String }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    label: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDateCompleted: { type: Boolean, default: false },
    verifiedCompletion: { type: Boolean, default: false },
  },
  { timestamps: true },
);

taskSchema.pre('save', function (next) {
  if (!this.taskCode) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.taskCode = `TASK-${timestamp}-${randomPart}`;
  }
  next();
});

taskSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Task', taskSchema);

import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    projectCode: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    client: { type: String, default: '' },
    department: { type: String, default: '' },
    color: { type: String, default: 'coral' },
    status: {
      type: String,
      enum: ['draft', 'planning', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled', 'archived'],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    budget: { type: Number, default: 0 },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    manager: { type: String, default: '' },
    members: [{ type: String }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
);

projectSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Project', projectSchema);

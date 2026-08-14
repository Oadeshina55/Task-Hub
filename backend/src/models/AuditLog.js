import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('AuditLog', auditLogSchema);

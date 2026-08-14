import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: String, default: '' },
  },
  { timestamps: true },
);

leaveSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Leave', leaveSchema);

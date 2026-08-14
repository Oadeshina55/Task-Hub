import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String, required: true },
    department: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'declined', 'questioned'], default: 'pending' },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approverName: { type: String, default: '' },
    comments: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

voucherSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Voucher', voucherSchema);

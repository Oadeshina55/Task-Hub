import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['task', 'project'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

commentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Comment', commentSchema);

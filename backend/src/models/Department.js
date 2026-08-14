import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    head: { type: String, default: '' },
    members: [{ type: String }],
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
);

departmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('Department', departmentSchema);

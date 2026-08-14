import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    department: { type: String, default: '' },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'member'],
      default: 'member',
    },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.id = obj._id;
  return obj;
};

export default mongoose.model('User', userSchema);

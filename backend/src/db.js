import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskhub';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected:', MONGO_URI);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

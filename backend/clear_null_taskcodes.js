import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from './src/models/Task.js';
dotenv.config();
(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskhub');
    const res = await Task.deleteMany({ $or: [{ taskCode: null }, { taskCode: { $exists: false } }] });
    console.log('deleted', res.deletedCount);
    await mongoose.disconnect();
  }catch(e){console.error(e);process.exit(1);} 
})();

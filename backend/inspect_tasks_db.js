import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from './src/models/Task.js';
dotenv.config();
(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskhub');
    const tasks = await Task.find().lean();
    console.log('TASKS COUNT', tasks.length);
    console.log(tasks.map(t => ({_id: t._id, taskCode: t.taskCode || null}))); 
    await mongoose.disconnect();
  }catch(e){console.error(e);process.exit(1);} 
})();

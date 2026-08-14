import dotenv from 'dotenv';
import express from 'express';
import { app, connectDB } from './app.js';

dotenv.config();
const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  const server = express();
  server.use('/api', app);
  server.listen(PORT, () => console.log(`TaskHub API running on http://localhost:${PORT}`));
}

start();

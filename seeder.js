import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Delete old admin and create with new credentials
  await User.deleteMany({ role: 'admin' });
  await User.create({ name: 'Udaya Admin', mobile: '6382666150', password: 'udaya@1011', role: 'admin' });
  console.log('✅ Admin set: mobile=6382666150  password=udaya@1011');

  mongoose.disconnect();
};

seed().catch(console.error);

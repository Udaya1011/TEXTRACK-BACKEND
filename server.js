import express from 'express'; // Restarting for port 5050
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import stockOutRoutes from './routes/stockOutRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error', err));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/stockout', stockOutRoutes);
app.use('/api/categories', categoryRoutes);

app.get('/', (req, res) => res.send('Udaya TexTrack API Running'));

if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
const PORT = process.env.PORT || 5000;

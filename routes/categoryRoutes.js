import express from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    
    const enhancedCategories = await Promise.all(categories.map(async (cat) => {
      // Find active products where category matches exactly (case-insensitive)
      const products = await Product.find({ 
        active: true,
        category: { $regex: new RegExp(`^${cat.name.trim()}$`, 'i') } 
      });
      const totalDesigns = products.length;
      let totalQuantities = 0;
      let totalWorth = 0;
      const sizeTotals = { S: 0, M: 0, L: 0, XL: 0 };
      
      products.forEach(p => {
        totalQuantities += (p.stock || 0);
        totalWorth += (p.stock || 0) * (p.pricePerPiece || 0);
        if (p.sizes) {
          sizeTotals.S += (p.sizes.S || 0);
          sizeTotals.M += (p.sizes.M || 0);
          sizeTotals.L += (p.sizes.L || 0);
          sizeTotals.XL += (p.sizes.XL || 0);
        }
      });
      
      return { ...cat, totalDesigns, totalQuantities, totalWorth, sizeTotals };
    }));
    
    res.json(enhancedCategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const category = await Category.create({ name: req.body.name });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

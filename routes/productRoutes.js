import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer config
const uploadDir = 'uploads/products';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Express static for uploads
router.use('/uploads', express.static('uploads'));

// Get all products (with search/filter/pagination)
router.get('/', protect, async (req, res) => {
  const { search, page = 1, limit = 20, category } = req.query;
  const query = { active: true };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { styleName: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) query.category = category;

  try {
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ products, total, pages: Math.ceil(total / limit), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create product
router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
  const { name, styleName, pricePerPiece, category, lowStockThreshold, variants } = req.body;
  try {
    let parsedVariants = [];
    let totalStock = 0;

    if (variants) {
      try {
        const inputVariants = JSON.parse(variants);
        if (Array.isArray(inputVariants)) {
          parsedVariants = inputVariants.map(v => {
            const vStock = (Number(v.sizes?.S)||0) + (Number(v.sizes?.M)||0) + (Number(v.sizes?.L)||0) + (Number(v.sizes?.XL)||0) + (Number(v.sizes?.['2XL'])||0) + (Number(v.sizes?.['3XL'])||0) + (Number(v.sizes?.['4XL'])||0);
            totalStock += vStock;
            return {
              color: v.color || '',
              sizes: {
                S: Number(v.sizes?.S)||0,
                M: Number(v.sizes?.M)||0,
                L: Number(v.sizes?.L)||0,
                XL: Number(v.sizes?.XL)||0,
                '2XL': Number(v.sizes?.['2XL'])||0,
                '3XL': Number(v.sizes?.['3XL'])||0,
                '4XL': Number(v.sizes?.['4XL'])||0,
              },
              stock: vStock
            };
          });
        }
      } catch(e) {}
    }

    let image = '';
    if (req.file) {
      try {
        const base64Data = fs.readFileSync(req.file.path, { encoding: 'base64' });
        image = `data:${req.file.mimetype};base64,${base64Data}`;
        fs.unlinkSync(req.file.path); // Delete local file
      } catch (err) {
        console.error('Failed to convert image to base64', err);
      }
    }

    const product = await Product.create({ 
      name, styleName, pricePerPiece, category, 
      lowStockThreshold: lowStockThreshold || 50, 
      image,
      variants: parsedVariants,
      stock: totalStock
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update product
router.put('/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) {
      try {
        const base64Data = fs.readFileSync(req.file.path, { encoding: 'base64' });
        updates.image = `data:${req.file.mimetype};base64,${base64Data}`;
        fs.unlinkSync(req.file.path); // Delete local file
      } catch (err) {
        console.error('Failed to convert image to base64', err);
      }
    }
    
    if (updates.variants) {
      try {
        const inputVariants = JSON.parse(updates.variants);
        if (Array.isArray(inputVariants)) {
          let totalStock = 0;
          updates.variants = inputVariants.map(v => {
            const vStock = (Number(v.sizes?.S)||0) + (Number(v.sizes?.M)||0) + (Number(v.sizes?.L)||0) + (Number(v.sizes?.XL)||0) + (Number(v.sizes?.['2XL'])||0) + (Number(v.sizes?.['3XL'])||0) + (Number(v.sizes?.['4XL'])||0);
            totalStock += vStock;
            return {
              color: v.color || '',
              sizes: {
                S: Number(v.sizes?.S)||0,
                M: Number(v.sizes?.M)||0,
                L: Number(v.sizes?.L)||0,
                XL: Number(v.sizes?.XL)||0,
                '2XL': Number(v.sizes?.['2XL'])||0,
                '3XL': Number(v.sizes?.['3XL'])||0,
                '4XL': Number(v.sizes?.['4XL'])||0,
              },
              stock: vStock
            };
          });
          updates.stock = totalStock;
        }
      } catch (e) {}
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete product
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

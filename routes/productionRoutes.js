import express from 'express';
import Production from '../models/Production.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();



// Get all production entries (with date filter)
router.get('/', protect, async (req, res) => {
  const { date, from, to, productId, page = 1, limit = 20 } = req.query;
  const query = {};
  if (productId) query.product = productId;

  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (from || to) {
    query.date = {};
    if (from) { const s = new Date(from); s.setHours(0,0,0,0); query.date.$gte = s; }
    if (to)   { const e = new Date(to); e.setHours(23,59,59,999); query.date.$lte = e; }
  }

  try {
    const total = await Production.countDocuments(query);
    const entries = await Production.find(query)
      .populate('product', 'name image pricePerPiece category')
      .populate('addedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ entries, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard stats
router.get('/stats', protect, async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

  try {
    const todayResult = await Production.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // Last 7 days chart data
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0);
    const chartData = await Production.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$quantity' } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ todayProduced: todayResult[0]?.total || 0, chartData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add production entry
router.post('/', protect, adminOnly, async (req, res) => {
  const { productId, quantity, date, notes, designName, colorName, price, totalValue, sizes } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // If sizes are provided, sum them up for quantity
    let calculatedQuantity = Number(quantity) || 0;
    if (sizes) {
      calculatedQuantity = (Number(sizes.S) || 0) + (Number(sizes.M) || 0) + (Number(sizes.L) || 0) + (Number(sizes.XL) || 0) + (Number(sizes['2XL']) || 0) + (Number(sizes['3XL']) || 0) + (Number(sizes['4XL']) || 0);
    }

    const entry = await Production.create({
      product: productId,
      designName,
      colorName,
      price: Number(price) || 0,
      quantity: calculatedQuantity,
      totalValue: Number(totalValue) || 0,
      sizes: sizes || { S: 0, M: 0, L: 0, XL: 0, '2XL': 0, '3XL': 0, '4XL': 0 },
      date: date ? new Date(date) : new Date(),
      addedBy: req.user._id,
      notes,
    });

    // Increase stock
    product.stock += calculatedQuantity;
    await product.save();

    const populated = await entry.populate('product', 'name image pricePerPiece category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update production entry
router.put('/:id', protect, adminOnly, async (req, res) => {
  const { quantity, date, notes, designName, colorName, price, totalValue, sizes } = req.body;
  try {
    console.log('UPDATING PRODUCTION:', req.params.id, req.body);
    const entry = await Production.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const product = await Product.findById(entry.product);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Calculate new quantity from sizes if provided
    let newQuantity = Number(quantity);
    if (sizes) {
      newQuantity = (Number(sizes.S) || 0) + (Number(sizes.M) || 0) + (Number(sizes.L) || 0) + (Number(sizes.XL) || 0) + (Number(sizes['2XL']) || 0) + (Number(sizes['3XL']) || 0) + (Number(sizes['4XL']) || 0);
    }

    // Adjust stock: subtract old quantity and add new quantity
    product.stock = product.stock - entry.quantity + newQuantity;
    await product.save();

    // Update entry fields
    if (designName !== undefined) entry.designName = designName;
    if (colorName !== undefined) entry.colorName = colorName;
    if (price !== undefined) entry.price = Number(price);
    if (totalValue !== undefined) entry.totalValue = Number(totalValue);
    if (sizes) entry.sizes = sizes;
    if (date) entry.date = new Date(date);
    if (notes !== undefined) entry.notes = notes;
    
    entry.quantity = newQuantity;
    
    await entry.save();
    const populated = await entry.populate('product', 'name image pricePerPiece category');
    console.log('UPDATE SUCCESSFUL');
    res.json(populated);
  } catch (err) {
    console.error('Update Production Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete production entry
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const entry = await Production.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    const product = await Product.findById(entry.product);
    if (product) { product.stock = Math.max(0, product.stock - entry.quantity); await product.save(); }
    await entry.deleteOne();
    res.json({ message: 'Production entry deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

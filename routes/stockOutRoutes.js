import express from 'express';
import StockOut from '../models/StockOut.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all stock-out entries
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
    const total = await StockOut.countDocuments(query);
    const entries = await StockOut.find(query)
      .populate('product', 'name image pricePerPiece')
      .populate('dispatchedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ entries, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard revenue stats
router.get('/stats', protect, async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

  try {
    const todayResult = await StockOut.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = await StockOut.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      todayOutgoing: todayResult[0]?.totalQty || 0,
      todayRevenue: todayResult[0]?.totalRevenue || 0,
      allTimeRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add stock-out / dispatch
router.post('/', protect, async (req, res) => {
  const { productId, quantity, date, notes } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < Number(quantity)) return res.status(400).json({ message: `Insufficient stock. Available: ${product.stock}` });

    const totalAmount = product.pricePerPiece * Number(quantity);
    const entry = await StockOut.create({
      product: productId,
      quantity: Number(quantity),
      totalAmount,
      date: date ? new Date(date) : new Date(),
      dispatchedBy: req.user._id,
      notes,
    });

    product.stock -= Number(quantity);
    await product.save();

    const populated = await entry.populate('product', 'name image pricePerPiece');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete stock-out entry
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await StockOut.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    const product = await Product.findById(entry.product);
    if (product) { product.stock += entry.quantity; await product.save(); }
    await entry.deleteOne();
    res.json({ message: 'Stock-out entry deleted and stock restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

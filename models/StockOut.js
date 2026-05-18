import mongoose from 'mongoose';

const stockOutSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
}, { timestamps: true });

stockOutSchema.index({ date: -1 });

export default mongoose.model('StockOut', stockOutSchema);

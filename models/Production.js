import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  designName: { type: String, trim: true, default: '' },
  colorName: { type: String, trim: true, default: '' },
  price: { type: Number, min: 0, default: 0 },
  quantity: { type: Number, required: true, min: 1 },
  totalValue: { type: Number, default: 0 },
  sizes: {
    S: { type: Number, default: 0 },
    M: { type: Number, default: 0 },
    L: { type: Number, default: 0 },
    XL: { type: Number, default: 0 },
    '2XL': { type: Number, default: 0 },
    '3XL': { type: Number, default: 0 },
    '4XL': { type: Number, default: 0 },
  },
  date: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
}, { timestamps: true });

productionSchema.index({ date: -1 });

export default mongoose.model('Production', productionSchema);

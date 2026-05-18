import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  styleName: { type: String, default: '', trim: true },
  image: { type: String, default: '' },
  pricePerPiece: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 50 },
  category: { type: String, default: 'T-Shirt', trim: true },
  isMens: { type: Boolean, default: false },
  variants: [{
    color: { type: String, required: true, trim: true },
    sizes: {
      S: { type: Number, default: 0 },
      M: { type: Number, default: 0 },
      L: { type: Number, default: 0 },
      XL: { type: Number, default: 0 },
      '2XL': { type: Number, default: 0 },
      '3XL': { type: Number, default: 0 },
      '4XL': { type: Number, default: 0 },
    },
    stock: { type: Number, default: 0 }
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ name: 'text', category: 'text' });

export default mongoose.model('Product', productSchema);

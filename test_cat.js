import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Category from './models/Category.js';
dotenv.config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const enhancedCategories = await Promise.all(categories.map(async (cat) => {
    const products = await Product.find({ 
      active: true,
      category: { $regex: new RegExp(`^${cat.name.trim()}$`, 'i') } 
    });
    const totalDesigns = products.length;
    let totalQuantities = 0;
    const sizeTotals = { S: 0, M: 0, L: 0, XL: 0 };
    products.forEach(p => {
      totalQuantities += (p.stock || 0);
      if (p.sizes) {
        sizeTotals.S += (p.sizes.S || 0);
        sizeTotals.M += (p.sizes.M || 0);
        sizeTotals.L += (p.sizes.L || 0);
        sizeTotals.XL += (p.sizes.XL || 0);
      }
    });
    return { ...cat, totalDesigns, totalQuantities, sizeTotals };
  }));
  console.log(JSON.stringify(enhancedCategories.find(c => c.name === 'POLO FS'), null, 2));
  process.exit(0);
});

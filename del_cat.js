import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Category = mongoose.model('Category', new mongoose.Schema({ name: String }));
  await Category.deleteMany({ name: { $in: ['LS', 'RN FS', 'RN HS'] } });
  console.log('Deleted LS, RN FS, RN HS');
  process.exit(0);
});

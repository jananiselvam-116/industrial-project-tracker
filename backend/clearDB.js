const mongoose = require('mongoose');
require('dotenv').config();

async function clear() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/industrial_monitoring_db');
    console.log('Connected to MongoDB. Dropping database...');
    await mongoose.connection.dropDatabase();
    console.log('Database dropped successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error dropping database:', err);
    process.exit(1);
  }
}
clear();

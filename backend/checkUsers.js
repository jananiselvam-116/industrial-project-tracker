const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const users = await User.find().select('-password');
    console.log(JSON.stringify(users, null, 2));
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

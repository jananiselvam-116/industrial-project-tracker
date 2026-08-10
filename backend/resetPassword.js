const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mini_project')
  .then(async () => {
    const User = require('./models/User');
    const user = await User.findOne({ email: 'arun@skylineinfra.com' });
    if (user) {
      user.password = 'Skyline@123';
      await user.save();
      console.log('Password reset successfully to: Skyline@123');
    } else {
      console.log('User not found!');
    }
    process.exit(0);
  })
  .catch(console.error);

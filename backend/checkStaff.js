const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mini_project')
  .then(async () => {
    const User = require('./models/User');
    
    // Check Rajesh (Manager)
    const rajesh = await User.findOne({ email: 'rajesh.kumar@gov.in' });
    if (rajesh) {
      rajesh.password = 'Rajesh@2026';
      await rajesh.save();
      console.log('Reset Rajesh password');
    } else {
      console.log('Rajesh not found');
    }

    // Check Arun Prakash (Site Engineer)
    const arunPrakash = await User.findOne({ email: 'arun.prakash@gov.in' });
    if (arunPrakash) {
      arunPrakash.password = 'Arun@2026';
      await arunPrakash.save();
      console.log('Reset Arun Prakash password');
    } else {
      console.log('Arun Prakash not found');
    }
    
    process.exit(0);
  })
  .catch(console.error);

const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mini_project')
  .then(async () => {
    const User = require('./models/User');
    const users = await User.find({ role: 'Company' }).populate('companyId');
    console.log('Company Users:');
    users.forEach(u => {
      console.log('Company: ' + (u.companyId ? u.companyId.name : 'Unknown') + ', Name: ' + u.name + ', Email: ' + u.email);
    });
    process.exit(0);
  })
  .catch(console.error);

const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const users = [
  { name: 'Government Admin', email: 'government@example.com', password: 'Password123!', role: 'Government' },
  { name: 'Project Manager', email: 'manager@example.com', password: 'Password123!', role: 'Manager' },
  { name: 'Site Employee', email: 'employee@example.com', password: 'Password123!', role: 'Employee' },
  { name: 'Construction Company', email: 'company@example.com', password: 'Password123!', role: 'Company' },
];

const importData = async () => {
  try {
    await connectDB();
    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

importData();

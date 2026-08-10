const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const User = require('./models/User');
const Organisation = require('./models/Organisation');

// Import all routes
const authRoutes = require('./routes/authRoutes');
const organisationRoutes = require('./routes/organisationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dailyUpdateRoutes = require('./routes/dailyUpdateRoutes');
const companyRoutes = require('./routes/companyRoutes');
const progressRoutes = require('./routes/progressRoutes');
const billRoutes = require('./routes/billRoutes');
const photoRoutes = require('./routes/photoRoutes');
const statsRoutes = require('./routes/statsRoutes');
const documentRoutes = require('./routes/documentRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const tenderRoutes = require('./routes/tenderRoutes');
const tenderApplicationRoutes = require('./routes/tenderApplicationRoutes');

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/tender-applications', tenderApplicationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Industrial Project Management API is running' });
});

// Create upload folders if they don't exist
function createUploadFolders() {
  const folders = ['uploads/bills', 'uploads/photos', 'uploads/documents'];
  for (let i = 0; i < folders.length; i++) {
    if (!fs.existsSync(folders[i])) {
      fs.mkdirSync(folders[i], { recursive: true });
    }
  }
}

// Start database and server
const startServer = async () => {
  try {
    await connectDB();
    
    // Auto-activate all organisations to simplify testing
    await Organisation.updateMany({ isActive: false }, { isActive: true });
    
    createUploadFolders();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log('Server started on port ' + PORT);
    });
  } catch (err) {
    console.error('Failed to start server', err);
  }
};

startServer();

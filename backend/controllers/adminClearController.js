const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Document = require('../models/Document');
const SalaryReport = require('../models/SalaryReport');
const Task = require('../models/Task');

// Clear all database collections (Dev only)
const clearAllData = async (req, res) => {
  try {
    const currentEnv = process.env.NODE_ENV;
    if (currentEnv !== 'development') {
      return res.status(403).json({ message: 'Endpoint disabled outside dev mode' });
    }

    // Run parallel deletion queries
    await Company.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await Document.deleteMany({});
    await SalaryReport.deleteMany({});
    await Task.deleteMany({});

    return res.status(200).json({ message: 'All data cleared successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      message: 'Failed to clear data', 
      error: err.message 
    });
  }
};

module.exports = {
  clearAllData
};

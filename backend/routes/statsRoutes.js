const express = require('express');
const router = express.Router();

const statsController = require('../controllers/statsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Get stats scoped by role dynamically
router.get('/', protect, authorizeRoles('Government', 'SuperAdmin', 'Manager', 'Company', 'Employee'), statsController.getStats);

module.exports = router;

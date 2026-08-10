const express = require('express');
const router = express.Router();

const progressController = require('../controllers/progressController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, progressController.getProgressList);
router.post('/', protect, authorizeRoles('Company', 'Employee', 'Manager', 'Government', 'SuperAdmin'), progressController.updateProgress);

module.exports = router;

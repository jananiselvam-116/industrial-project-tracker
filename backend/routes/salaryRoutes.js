const express = require('express');
const router = express.Router();

const salaryController = require('../controllers/salaryController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRoles('Employee'), salaryController.submitSalaryReport);
router.get('/', protect, authorizeRoles('Manager', 'Employee', 'Government'), salaryController.getSalaryReports);
router.patch('/:id/status', protect, authorizeRoles('Manager'), salaryController.updateSalaryReportStatus);

module.exports = router;

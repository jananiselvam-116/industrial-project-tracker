const express = require('express');
const router = express.Router();

const verificationController = require('../controllers/verificationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRoles('Employee'), verificationController.submitVerificationReport);
router.get('/', protect, authorizeRoles('Manager', 'Employee', 'Government'), verificationController.getVerificationReports);
router.patch('/:id/status', protect, authorizeRoles('Manager'), verificationController.updateVerificationReportStatus);

module.exports = router;

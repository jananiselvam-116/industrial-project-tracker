const express = require('express');
const router = express.Router();

const billController = require('../controllers/billController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { billUpload } = require('../middleware/uploadMiddleware');

// Get all bills based on user role
router.get('/', protect, authorizeRoles('Manager', 'Company', 'Employee', 'Government', 'SuperAdmin'), billController.getBills);

// Submit a bill with single file upload
router.post('/', protect, authorizeRoles('Company', 'Employee', 'Manager', 'SuperAdmin'), billUpload.single('billFile'), billController.uploadBill);

// Site engineer verifies a bill
router.patch('/:id/verify', protect, authorizeRoles('Employee', 'Manager', 'SuperAdmin'), billController.verifyBill);

// Manager/Government approves or rejects a bill
router.patch('/:id/status', protect, authorizeRoles('Manager', 'SuperAdmin', 'Government'), billController.changeBillStatus);

module.exports = router;

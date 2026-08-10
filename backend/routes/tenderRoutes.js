const express = require('express');
const router = express.Router();

const tenderController = require('../controllers/tenderController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Get all tenders
router.get('/', protect, tenderController.getTenders);

// Create a new tender (Government/SuperAdmin only)
router.post('/', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.createTender);

// Get single tender details
router.get('/:id', protect, tenderController.getTender);

// Update a tender details
router.put('/:id', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.updateTender);

// Tender Applications handling
router.get('/:id/applications', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.getApplicationsForTender);
router.patch('/applications/:appId/review', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.reviewApplication);
router.post('/applications/:appId/assign-manager', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.assignManagerAndCreateProject);

// Release final project payment
router.post('/:id/release-payment', protect, authorizeRoles('Government', 'SuperAdmin'), tenderController.releasePayment);

module.exports = router;

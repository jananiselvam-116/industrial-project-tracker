const express = require('express');
const router = express.Router();

const tenderAppController = require('../controllers/tenderApplicationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { documentUpload } = require('../middleware/uploadMiddleware');

// Define file fields for tender application file uploads
const tenderUploadMiddlewareFields = documentUpload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 5 }
]);

// Apply for a tender (Company role only)
router.post('/', protect, authorizeRoles('Company'), tenderUploadMiddlewareFields, tenderAppController.applyForTender);

// View company's own applications list
router.get('/my', protect, authorizeRoles('Company'), tenderAppController.getMyApplications);

// View single application detail
router.get('/:id', protect, tenderAppController.getApplicationDetail);

module.exports = router;

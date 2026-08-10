const express = require('express');
const router = express.Router();

const documentController = require('../controllers/documentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { documentUpload } = require('../middleware/uploadMiddleware');

router.get('/', protect, authorizeRoles('Manager', 'Company', 'Employee', 'Government'), documentController.getDocuments);
router.post('/', protect, authorizeRoles('Company', 'Employee'), documentUpload.single('documentFile'), documentController.uploadDocument);

module.exports = router;

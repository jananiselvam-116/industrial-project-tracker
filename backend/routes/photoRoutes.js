const express = require('express');
const router = express.Router();

const photoController = require('../controllers/photoController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { photoUpload } = require('../middleware/uploadMiddleware');

router.get('/', protect, authorizeRoles('Manager', 'Company', 'Employee', 'Government'), photoController.getPhotos);
router.post('/', protect, authorizeRoles('Employee', 'Company'), photoUpload.single('photoFile'), photoController.uploadPhoto);

module.exports = router;

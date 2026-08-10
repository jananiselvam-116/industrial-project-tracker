const express = require('express');
const router = express.Router();

const dailyUpdateController = require('../controllers/dailyUpdateController');
const { protect, authorizeRoles, requireOrg } = require('../middleware/authMiddleware');
const { photoUpload } = require('../middleware/uploadMiddleware');

router.get('/', protect, dailyUpdateController.getDailyUpdates);

// Submit update with support for uploading multiple site photos
router.post('/', protect, requireOrg, authorizeRoles('Company', 'Employee', 'Manager', 'SuperAdmin'), photoUpload.array('photos', 10), dailyUpdateController.createDailyUpdate);

// Manager reviews the update
router.patch('/:id/review', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin'), dailyUpdateController.reviewDailyUpdate);

module.exports = router;

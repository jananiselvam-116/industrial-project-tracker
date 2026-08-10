const express = require('express');
const router = express.Router();

const adminUserController = require('../controllers/adminUserController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/managers', protect, authorizeRoles('Government', 'SuperAdmin'), adminUserController.getManagers);
router.post('/', protect, authorizeRoles('Government', 'SuperAdmin'), adminUserController.createUserAndAssign);
router.get('/pending', protect, authorizeRoles('Government', 'SuperAdmin', 'Manager'), adminUserController.getPendingUsers);
router.put('/:id/approve', protect, authorizeRoles('Government', 'SuperAdmin', 'Manager'), adminUserController.approveUser);

module.exports = router;

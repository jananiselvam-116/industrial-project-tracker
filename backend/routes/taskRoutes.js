const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const { protect, authorizeRoles, requireOrg } = require('../middleware/authMiddleware');

router.get('/', protect, taskController.getTasks);
router.post('/', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin', 'Government'), taskController.createTask);
router.put('/:id', protect, requireOrg, taskController.updateTask); // Site Engineer and Manager can update
router.delete('/:id', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin', 'Government'), taskController.deleteTask);

module.exports = router;

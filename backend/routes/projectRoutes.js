const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const { protect, authorizeRoles, requireOrg } = require('../middleware/authMiddleware');

router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProject);

// Manager / Government routes
router.post('/', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin', 'Government'), projectController.createProject);
router.put('/:id', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin', 'Government'), projectController.updateProject);
router.delete('/:id', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin', 'Government'), projectController.deleteProject);

// Assign site engineer to project
router.post('/:id/assign-engineer', protect, requireOrg, authorizeRoles('Manager', 'SuperAdmin'), projectController.assignEngineer);

module.exports = router;

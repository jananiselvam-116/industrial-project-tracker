const express = require('express');
const router = express.Router();

const orgController = require('../controllers/organisationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const checkSuperAdmin = authorizeRoles('SuperAdmin', 'Government');

// Admin CRUD routes for Organisations
router.get('/', protect, checkSuperAdmin, orgController.getOrganisations);
router.post('/', protect, checkSuperAdmin, orgController.createOrganisation);
router.get('/:id', protect, checkSuperAdmin, orgController.getOrganisation);
router.put('/:id', protect, checkSuperAdmin, orgController.updateOrganisation);

// Activation / deactivation
router.put('/:id/activate', protect, checkSuperAdmin, orgController.activateOrg);
router.put('/:id/deactivate', protect, checkSuperAdmin, orgController.deactivateOrg);

// Fetch stats for specific organisation
router.get('/:id/stats', protect, authorizeRoles('SuperAdmin', 'Government', 'Manager', 'Company'), orgController.getOrgStats);

module.exports = router;

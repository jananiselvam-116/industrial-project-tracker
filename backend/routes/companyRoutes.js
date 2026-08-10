const express = require('express');
const router = express.Router();

const companyController = require('../controllers/companyController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Get profile of currently logged-in Company user
router.get('/profile', protect, authorizeRoles('Company'), companyController.getCompanyProfile);

// Standard CRUD routes for Company
router.get('/', protect, companyController.getCompanies);
router.post('/', protect, authorizeRoles('Company', 'Employee', 'Manager', 'Government', 'SuperAdmin'), companyController.createCompany);
router.put('/:id', protect, authorizeRoles('Company', 'Employee', 'Manager', 'Government', 'SuperAdmin'), companyController.updateCompany);
router.delete('/:id', protect, authorizeRoles('Employee', 'Manager', 'Government', 'SuperAdmin'), companyController.deleteCompany);

module.exports = router;

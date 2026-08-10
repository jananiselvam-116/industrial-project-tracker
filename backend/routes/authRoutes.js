const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/public-register', authController.publicRegisterUser);
router.get('/organisations', authController.getActiveOrganisations);

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.post('/register-company', protect, authorizeRoles('Government', 'SuperAdmin'), authController.registerCompany);
router.post('/register', protect, authorizeRoles('Government', 'SuperAdmin', 'Manager'), authController.registerUser);
router.get('/users', protect, authorizeRoles('Government', 'SuperAdmin', 'Manager'), authController.getAllUsers);

module.exports = router;

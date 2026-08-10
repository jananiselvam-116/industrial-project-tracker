const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Company = require('../models/Company');
const generateToken = require('../utils/generateToken');

// User Login API
const loginUser = async (req, res) => {
  const { usernameOrEmail, email, username, password } = req.body;
  
  // Find search query
  let loginQuery = usernameOrEmail || email || username || '';
  loginQuery = loginQuery.trim().toLowerCase();

  if (!loginQuery) {
    return res.status(400).json({ message: 'Username or email is required' });
  }

  try {
    // Find user in DB
    const user = await User.findOne({
      $or: [
        { email: loginQuery },
        { username: loginQuery }
      ]
    }).populate('companyId', 'name isActive');

    if (user) {
      const match = await user.matchPassword(password);
      if (match) {
        if (!user.isActive) {
          return res.status(403).json({ message: 'Your account has been deactivated.' });
        }

        // Return user data and token
        return res.json({
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          companyId: user.companyId?._id || user.companyId || null,
          companyName: user.companyId?.name || null,
          phone: user.phone,
          designation: user.designation,
          token: generateToken(user._id)
        });
      }
    }

    return res.status(401).json({ message: 'Invalid username, email, or password' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Register a new Company details
const registerCompany = async (req, res) => {
  try {
    const {
      orgName, registrationNo, industry, address, contactEmail, contactPhone,
      userName, userUsername, userEmail, userPassword, userPhone
    } = req.body;

    const emailKey = (userEmail || '').trim().toLowerCase();
    const usernameKey = (userUsername || userName || '').trim().toLowerCase();

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email: emailKey }, { username: usernameKey }]
    });

    if (userExists) {
      return res.status(400).json({ message: 'A user with this email or username already exists.' });
    }

    // Create organisation first
    const org = await Organisation.create({
      name: orgName,
      registrationNo: registrationNo || '',
      industry: industry || 'Construction',
      address: address || '',
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : emailKey,
      contactPhone: contactPhone || '',
      isActive: true
    });

    const defaultCompanyPermissions = [
      'org_view',
      'project_view',
      'bill_submit',
      'bill_view',
      'salary_view',
      'verification_view',
      'company_view'
    ];

    // Create company user
    const user = await User.create({
      name: userName,
      username: usernameKey,
      email: emailKey,
      password: userPassword,
      role: 'Company',
      companyId: org._id,
      phone: userPhone || '',
      permissions: defaultCompanyPermissions
    });

    // Link user to organisation
    org.ownerUserId = user._id;
    await org.save();

    // Create legacy Company entry
    await Company.create({
      companyName: orgName,
      projectName: '',
      investmentCommitted: 0,
      expense: 0,
      employeesExpected: 0,
      projectStatus: 'Not Started',
      createdBy: req.user._id,
      companyUser: user._id
    });

    res.status(201).json({
      message: 'Company registered successfully. The company user can now log in.',
      organisation: { _id: org._id, name: org.name, isActive: org.isActive },
      user: { _id: user._id, name: user.name, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Admin adds staff user account
const registerUser = async (req, res) => {
  try {
    if (!req.user || !['Government', 'SuperAdmin', 'Manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: only authorized administrators can create user accounts' });
    }

    const { name, username, email, phone, password, role, companyId, designation, managerId } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const normalizedRole = role || 'Employee';

    if (normalizedRole === 'Company') {
      return res.status(403).json({ message: 'Company accounts must be created through /auth/register-company' });
    }

    // Role hierarchy guards
    if (req.user.role === 'Manager' && normalizedRole !== 'Employee') {
      return res.status(403).json({ message: 'Managers may only create Government Site Engineer accounts' });
    }

    if (normalizedRole === 'Manager' && !['Government', 'SuperAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only Government Admin can create Government Manager accounts' });
    }

    const emailSearch = email.trim().toLowerCase();
    const userSearch = username.trim().toLowerCase();

    const exists = await User.findOne({
      $or: [{ email: emailSearch }, { username: userSearch }]
    });

    if (exists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const rolePermissionsMap = {
      'SuperAdmin': ['org_manage', 'user_manage', 'project_manage', 'bill_manage', 'salary_manage', 'verification_manage', 'super_admin'],
      'Government': ['org_manage', 'user_manage', 'project_manage', 'bill_manage', 'salary_manage', 'verification_manage', 'super_admin'],
      'Company': ['org_view', 'project_view', 'bill_submit', 'bill_view', 'salary_view', 'verification_view', 'company_view'],
      'Manager': ['project_view', 'project_create', 'project_manage', 'bill_manage', 'bill_view', 'salary_manage', 'salary_view', 'verification_manage', 'verification_view', 'task_manage', 'task_view', 'update_view', 'update_review', 'employee_manage', 'manager_view'],
      'Employee': ['project_view', 'bill_verify', 'bill_view', 'salary_submit', 'salary_view', 'verification_submit', 'verification_view', 'task_view', 'task_update', 'update_submit', 'update_view', 'employee_view']
    };

    const finalPermissions = rolePermissionsMap[normalizedRole] || rolePermissionsMap['Employee'];

    const user = await User.create({
      name: name || username,
      username: userSearch,
      email: emailSearch,
      phone: phone || '',
      password,
      role: normalizedRole,
      companyId: companyId || null,
      managerId: managerId || null,
      designation: designation || '',
      permissions: finalPermissions,
      isActive: true
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId,
      phone: user.phone,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during user registration' });
  }
};

// Get current profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await User.findById(req.user._id).select('-password').populate('companyId', 'name isActive industry');
    
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      companyId: user.companyId?._id || user.companyId || null,
      companyName: user.companyId?.name || null,
      phone: user.phone,
      designation: user.designation,
      isActive: user.isActive
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

// Public Self-Registration for Manager/Employee
const publicRegisterUser = async (req, res) => {
  try {
    const { name, username, email, phone, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Username, email, password, and role are required' });
    }

    if (!['Manager', 'Employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for self-registration' });
    }

    const emailSearch = email.trim().toLowerCase();
    const userSearch = username.trim().toLowerCase();

    const exists = await User.findOne({
      $or: [{ email: emailSearch }, { username: userSearch }]
    });

    if (exists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const rolePermissionsMap = {
      'Manager': ['project_view', 'project_create', 'project_manage', 'bill_manage', 'bill_view', 'salary_manage', 'salary_view', 'verification_manage', 'verification_view', 'task_manage', 'task_view', 'update_view', 'update_review', 'employee_manage', 'manager_view'],
      'Employee': ['project_view', 'bill_verify', 'bill_view', 'salary_submit', 'salary_view', 'verification_submit', 'verification_view', 'task_view', 'task_update', 'update_submit', 'update_view', 'employee_view']
    };

    const finalPermissions = rolePermissionsMap[role];

    const user = await User.create({
      name: name || username,
      username: userSearch,
      email: emailSearch,
      phone: phone || '',
      password,
      role: role,
      companyId: null,
      managerId: null,
      designation: '',
      permissions: finalPermissions,
      isActive: false // Needs admin approval to activate
    });

    res.status(201).json({ message: 'Registration successful. Waiting for admin approval.', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Get list of users depending on the user's role
const getAllUsers = async (req, res) => {
  try {
    let queryFilter = {};

    if (req.user.role === 'Manager') {
      queryFilter = {
        $or: [
          { managerId: req.user._id, role: 'Employee' },
          { role: 'Company' }
        ]
      };
    } else if (req.user.role === 'Company' || req.user.role === 'Employee') {
      const orgId = req.user.companyId?._id || req.user.companyId;
      if (orgId) {
        queryFilter = { companyId: orgId };
      } else {
        queryFilter = { _id: req.user._id };
      }
    }

    const users = await User.find(queryFilter).select('-password').populate('companyId', 'name');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// Get Active Organizations
const getActiveOrganisations = async (req, res) => {
  try {
    const orgs = await Organisation.find({ isActive: true }).select('name');
    res.json(orgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching companies' });
  }
};

// Mock Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this email' });
    }
    res.json({ message: 'Password reset instructions have been sent to ' + email + ' (mocked).' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing forgot password request' });
  }
};

module.exports = {
  loginUser,
  registerCompany,
  registerUser,
  getProfile,
  getAllUsers,
  getActiveOrganisations,
  forgotPassword,
  publicRegisterUser
};

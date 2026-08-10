const jwt = require('jsonwebtoken');
const User = require('../models/User');

// protect: checks if user is logged in by verifying JWT token
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password').populate('companyId', 'name isActive');

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized user' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact your administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token is not valid or expired' });
  }
};

// authorizeRoles: checks if the user's role is in the allowed list
// For Government/SuperAdmin-only routes, only role match or super_admin permission works
// For other routes, permission overlap also allows access
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // direct role match - always works
    if (roles.includes(req.user.role)) {
      return next();
    }

    const userPerms = req.user.permissions || [];

    // users with super_admin permission can do anything
    if (userPerms.includes('super_admin')) {
      return next();
    }

    // if route is only for Government/SuperAdmin, don't allow permission fallback
    // this prevents managers from accessing government-only routes
    const elevatedOnly = ['SuperAdmin', 'Government'];
    const isGovOnly = roles.every(r => elevatedOnly.includes(r));

    if (isGovOnly) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    // for other roles, allow if user has matching permissions
    const permMap = {
      Company: ['org_view', 'project_view', 'bill_submit', 'bill_view', 'salary_view', 'verification_view', 'company_view'],
      Manager: ['project_view', 'project_create', 'project_manage', 'bill_manage', 'bill_view', 'salary_manage', 'salary_view', 'verification_manage', 'verification_view', 'task_manage', 'task_view', 'update_view', 'update_review', 'employee_manage', 'manager_view'],
      Employee: ['project_view', 'bill_verify', 'bill_view', 'salary_submit', 'salary_view', 'verification_submit', 'verification_view', 'task_view', 'task_update', 'update_submit', 'update_view', 'employee_view']
    };

    for (let i = 0; i < roles.length; i++) {
      const rolePerms = permMap[roles[i]] || [];
      const hasMatch = rolePerms.some(p => userPerms.includes(p));
      if (hasMatch) return next();
    }

    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  };
};

// authorizePermissions: checks for specific permission strings directly
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPerms = req.user.permissions || [];

    if (req.user.role === 'SuperAdmin' || req.user.role === 'Government' || userPerms.includes('super_admin')) {
      return next();
    }

    const hasIt = requiredPermissions.some(p => userPerms.includes(p));
    if (hasIt) return next();

    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  };
};

// requireOrg: makes sure user has an organisation (Managers, Employees, Company users)
const requireOrg = (req, res, next) => {
  if (req.user.role === 'SuperAdmin' || req.user.role === 'Government') return next();
  if (req.user.permissions && req.user.permissions.includes('super_admin')) return next();

  if (!req.user.companyId) {
    return res.status(403).json({ message: 'No organisation associated with your account. Contact your administrator.' });
  }

  if (req.user.companyId && req.user.companyId.isActive === false) {
    return res.status(403).json({ message: 'Your organisation has been deactivated. Contact the platform administrator.' });
  }

  next();
};

// setOrgFilter: adds orgFilter to req based on user role (used in some controllers)
const setOrgFilter = (req, res, next) => {
  if (req.user.role === 'SuperAdmin' || req.user.role === 'Government') {
    req.orgFilter = {};
  } else {
    const orgId = req.user.companyId?._id || req.user.companyId;
    req.orgFilter = { organisationId: orgId };
  }
  next();
};

module.exports = { protect, authorizeRoles, authorizePermissions, requireOrg, setOrgFilter };

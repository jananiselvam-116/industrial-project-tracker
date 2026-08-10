const User = require('../models/User');
const Company = require('../models/Company');

// Government admin creates a Manager or Employee account and links it to a legacy company
const createUserAndAssign = async (req, res) => {
  try {
    const { name, username, email, password, role, companyId, phone, designation } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Email, username and password are required' });
    }

    const emailSearch = email.trim().toLowerCase();
    const userSearch = username.trim().toLowerCase();

    // Check duplicate
    const exists = await User.findOne({
      $or: [{ email: emailSearch }, { username: userSearch }]
    });

    if (exists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    let targetCompany = null;
    let managerIdVal = null;
    const finalRole = role || 'Employee';

    if (companyId) {
      targetCompany = await Company.findById(companyId);
      if (!targetCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }
      
      // Auto-assign manager if assigning an employee
      if (finalRole === 'Employee' && targetCompany.assignedManager) {
        managerIdVal = targetCompany.assignedManager;
      }
    }

    const rolePermissionsMap = {
      'SuperAdmin': ['org_manage', 'user_manage', 'project_manage', 'bill_manage', 'salary_manage', 'verification_manage', 'super_admin'],
      'Government': ['org_manage', 'user_manage', 'project_manage', 'bill_manage', 'salary_manage', 'verification_manage', 'super_admin'],
      'Company': ['org_view', 'project_view', 'bill_submit', 'bill_view', 'salary_view', 'verification_view', 'company_view'],
      'Manager': ['project_view', 'project_create', 'project_manage', 'bill_manage', 'bill_view', 'salary_manage', 'salary_view', 'verification_manage', 'verification_view', 'task_manage', 'task_view', 'update_view', 'update_review', 'employee_manage', 'manager_view'],
      'Employee': ['project_view', 'bill_verify', 'bill_view', 'salary_submit', 'salary_view', 'verification_submit', 'verification_view', 'task_view', 'task_update', 'update_submit', 'update_view', 'employee_view']
    };

    const newStaffUser = await User.create({
      name: name,
      username: userSearch,
      email: emailSearch,
      password: password,
      role: finalRole,
      isActive: true,
      phone: phone || '',
      designation: designation || '',
      permissions: rolePermissionsMap[finalRole] || rolePermissionsMap['Employee'],
      companyId: targetCompany ? targetCompany._id : null,
      managerId: managerIdVal
    });

    // Update the legacy Company document
    if (targetCompany) {
      if (newStaffUser.role === 'Manager') {
        targetCompany.assignedManager = newStaffUser._id;
      } else if (newStaffUser.role === 'Employee') {
        let currentEngs = targetCompany.assignedEngineers || [];
        if (!currentEngs.map(e => e.toString()).includes(newStaffUser._id.toString())) {
          currentEngs.push(newStaffUser._id);
        }
        targetCompany.assignedEngineers = currentEngs;
      }
      await targetCompany.save();
    }

    res.status(201).json({ message: 'User created and linked', user: newStaffUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fetch pending self-registered users awaiting approval
const getPendingUsers = async (req, res) => {
  try {
    let pendingFilter = { isActive: false };
    const userRole = req.user.role;
    
    if (userRole === 'Manager') {
      pendingFilter.role = 'Employee'; // Managers can approve Site Engineers
    } else if (userRole === 'Government' || userRole === 'SuperAdmin') {
      pendingFilter.role = 'Manager'; // Admins can approve Managers
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const pendingUsersList = await User.find(pendingFilter).select('-password');
    res.json(pendingUsersList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve a self-registered user
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRole = req.user.role;

    if (userRole === 'Manager' && targetUser.role !== 'Employee') {
      return res.status(403).json({ message: 'Managers can only approve Site Engineers' });
    }
    
    if (['Government', 'SuperAdmin'].includes(userRole) && targetUser.role !== 'Manager') {
      return res.status(403).json({ message: 'Government admins can only approve Managers' });
    }

    targetUser.isActive = true;
    
    // Assign manager ID to Employee
    if (userRole === 'Manager') {
      targetUser.managerId = req.user._id;
    }
    
    await targetUser.save();
    res.json({ message: 'User approved successfully', user: targetUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fetch list of active Managers
const getManagers = async (req, res) => {
  try {
    const activeManagers = await User.find({ role: 'Manager', isActive: true })
      .select('name email username phone');
      
    res.json(activeManagers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving managers' });
  }
};

module.exports = {
  createUserAndAssign,
  getPendingUsers,
  approveUser,
  getManagers
};

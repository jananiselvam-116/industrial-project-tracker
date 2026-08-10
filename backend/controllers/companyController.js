const Company = require('../models/Company');
const Progress = require('../models/Progress');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Create a new Company profile entry
const createCompany = async (req, res) => {
  try {
    const { 
      companyName, projectName, investmentCommitted, expense, 
      employeesExpected, deadline, projectStatus, companyUser 
    } = req.body;

    const createdCompany = await Company.create({
      companyName: companyName,
      projectName: projectName || '',
      investmentCommitted: investmentCommitted || 0,
      expense: expense || 0,
      employeesExpected: employeesExpected || 0,
      deadline: deadline || undefined,
      projectStatus: projectStatus || 'Not Started',
      createdBy: req.user._id,
      companyUser: companyUser || undefined
    });

    res.status(201).json(createdCompany);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating company' });
  }
};

// Update an existing Company profile
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyProj = await Company.findById(id);
    const userRole = req.user.role;

    if (!companyProj) {
      return res.status(404).json({ message: 'Company project not found' });
    }

    // Role-based authorization check
    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      // Government Admin has full access
      if (req.body.assignedManager !== undefined) {
        companyProj.assignedManager = req.body.assignedManager || null;
      }
      if (req.body.assignedEmployee !== undefined) {
        companyProj.assignedEmployee = req.body.assignedEmployee || null;
        companyProj.assignedEngineers = req.body.assignedEmployee ? [req.body.assignedEmployee] : [];
      }
      if (req.body.assignedEngineers !== undefined) {
        companyProj.assignedEngineers = req.body.assignedEngineers || [];
        if (req.body.assignedEngineers && req.body.assignedEngineers.length > 0) {
          companyProj.assignedEmployee = req.body.assignedEngineers[0];
        } else {
          companyProj.assignedEmployee = null;
        }
      }
    } else if (userRole === 'Manager') {
      // Managers can only update projects assigned to them
      if (companyProj.assignedManager?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: this project is not assigned to you' });
      }
      if (req.body.assignedEmployee !== undefined) {
        companyProj.assignedEmployee = req.body.assignedEmployee || null;
        companyProj.assignedEngineers = req.body.assignedEmployee ? [req.body.assignedEmployee] : [];
      }
      if (req.body.assignedEngineers !== undefined) {
        companyProj.assignedEngineers = req.body.assignedEngineers || [];
        if (req.body.assignedEngineers && req.body.assignedEngineers.length > 0) {
          companyProj.assignedEmployee = req.body.assignedEngineers[0];
        } else {
          companyProj.assignedEmployee = null;
        }
      }
      if (req.body.companyUser !== undefined) {
        companyProj.companyUser = req.body.companyUser || null;
      }
    } else if (userRole === 'Employee') {
      // Site engineers can only update status
      const assignedIds = companyProj.assignedEngineers?.map(e => e.toString()) || [];
      const isAssignedUser = 
        companyProj.assignedEmployee?.toString() === req.user._id.toString() ||
        assignedIds.includes(req.user._id.toString());

      if (!isAssignedUser) {
        return res.status(403).json({ message: 'Forbidden: you are not assigned to this project' });
      }
      if (req.body.projectStatus !== undefined) {
        companyProj.projectStatus = req.body.projectStatus;
      }
    } else if (userRole === 'Company') {
      // Companies can only edit their own submitted projects
      const isOwner = 
        companyProj.companyUser?.toString() === req.user._id.toString() ||
        companyProj.createdBy?.toString() === req.user._id.toString();

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: cannot edit this project' });
      }
    }

    // Common fields update (except for Employee)
    if (userRole !== 'Employee') {
      if (req.body.companyName !== undefined) companyProj.companyName = req.body.companyName;
      if (req.body.projectName !== undefined) companyProj.projectName = req.body.projectName;
      if (req.body.investmentCommitted !== undefined) companyProj.investmentCommitted = req.body.investmentCommitted;
      if (req.body.expense !== undefined) companyProj.expense = req.body.expense;
      if (req.body.employeesExpected !== undefined) companyProj.employeesExpected = req.body.employeesExpected;
      if (req.body.deadline !== undefined) companyProj.deadline = req.body.deadline;
      if (req.body.projectStatus !== undefined) companyProj.projectStatus = req.body.projectStatus;
    }

    const savedCompany = await companyProj.save();
    res.json(savedCompany);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating company' });
  }
};

// Delete Company entry
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyProj = await Company.findById(id);

    if (!companyProj) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (req.user.role === 'Employee' && companyProj.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: cannot delete this company' });
    }

    // Delete progress entries
    await Progress.deleteMany({ companyId: companyProj._id });
    
    // delete company
    await Company.deleteOne({ _id: companyProj._id });
    
    res.json({ message: 'Company removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting company' });
  }
};

// Fetch companies list depending on roles
const getCompanies = async (req, res) => {
  try {
    let companyFilter = {};
    const userRole = req.user.role;

    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      // Government sees all
    } else if (userRole === 'Manager') {
      companyFilter.assignedManager = req.user._id;
    } else if (userRole === 'Employee') {
      companyFilter.$or = [
        { assignedEmployee: req.user._id },
        { assignedEngineers: req.user._id }
      ];
    } else if (userRole === 'Company') {
      companyFilter.$or = [
        { createdBy: req.user._id },
        { companyUser: req.user._id }
      ];
    }

    const companiesList = await Company.find(companyFilter)
      .populate('assignedEmployee', 'name email')
      .populate('assignedEngineers', 'name email designation')
      .populate('assignedManager', 'name email')
      .sort({ createdAt: -1 });

    const progressRecords = await Progress.find();

    const mergedList = [];
    for (let i = 0; i < companiesList.length; i++) {
      const comp = companiesList[i];
      const matchProg = progressRecords.find((prog) => {
        return (
          prog.companyId.toString() === comp._id.toString() ||
          prog.projectId?.toString() === comp._id.toString()
        );
      });

      const compObj = comp.toObject();
      compObj.progress = matchProg || {
        investmentSpent: 0,
        employeesCurrent: 0,
        completionPercentage: 0
      };

      mergedList.push(compObj);
    }

    res.json(mergedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching companies' });
  }
};

// Fetch single company profile for company user
const getCompanyProfile = async (req, res) => {
  try {
    const companyProj = await Company.findOne({ 
      $or: [
        { createdBy: req.user._id }, 
        { companyUser: req.user._id }
      ] 
    });

    if (!companyProj) {
      return res.status(404).json({ message: 'No company profile found for this user' });
    }

    const progressRecord = await Progress.findOne({ companyId: companyProj._id });
    const percentVal = progressRecord?.completionPercentage ?? 0;

    let trackStatus = 'On Track';
    if (percentVal >= 100) {
      trackStatus = 'Completed';
    } else if (percentVal < 30) {
      trackStatus = 'Early Stage';
    } else if (percentVal < 60) {
      trackStatus = 'In Progress';
    }

    const resultObj = companyProj.toObject();
    resultObj.progress = progressRecord || {
      investmentSpent: 0,
      employeesCurrent: 0,
      completionPercentage: 0
    };
    resultObj.status = trackStatus;

    res.json(resultObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

module.exports = {
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanies,
  getCompanyProfile
};

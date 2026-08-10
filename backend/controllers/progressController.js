const Progress = require('../models/Progress');
const Project = require('../models/Project');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Update project completion progress
const updateProgress = async (req, res) => {
  try {
    const { projectId, investmentSpent, employeesCurrent, completionPercentage } = req.body;
    const legacyId = req.body.companyId; // backward compatibility fallback
    const orgId = getUserCompanyId(req);
    const refId = projectId || legacyId;

    // Update Project model completion if projectId is passed
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (completionPercentage !== undefined) {
        project.completionPercentage = completionPercentage;
      }
      if (req.body.projectStatus) {
        project.projectStatus = req.body.projectStatus;
      }
      await project.save();
    }

    let progressRecord = await Progress.findOne({ 
      $or: [
        { projectId: refId }, 
        { companyId: refId }
      ] 
    });

    if (!progressRecord) {
      progressRecord = new Progress({ 
        companyId: legacyId || null, 
        projectId: projectId || null, 
        organisationId: orgId 
      });
    }

    if (investmentSpent !== undefined) {
      progressRecord.investmentSpent = investmentSpent;
    }
    if (employeesCurrent !== undefined) {
      progressRecord.employeesCurrent = employeesCurrent;
    }
    if (completionPercentage !== undefined) {
      progressRecord.completionPercentage = completionPercentage;
    }
    if (orgId) {
      progressRecord.organisationId = orgId;
    }

    const savedProgress = await progressRecord.save();
    res.json(savedProgress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating progress' });
  }
};

// Fetch list of progress records
const getProgressList = async (req, res) => {
  try {
    let progressFilter = {};
    const userRole = req.user.role;

    if (userRole !== 'SuperAdmin' && userRole !== 'Government') {
      progressFilter.organisationId = getUserCompanyId(req);
    }

    const progressRecords = await Progress.find(progressFilter)
      .populate('companyId', 'companyName investmentCommitted employeesExpected')
      .populate('projectId', 'projectName investmentCommitted employeesExpected organisationId');

    res.json(progressRecords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching progress' });
  }
};

module.exports = {
  updateProgress,
  getProgressList
};

const VerificationReport = require('../models/VerificationReport');
const Project = require('../models/Project');
const Progress = require('../models/Progress');
const SalaryReport = require('../models/SalaryReport');
const { calcProgress } = require('../utils/constructionMetrics');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Recalculates progress for a project by collecting all verified metrics
async function recalcProjectProgress(projectId) {
  // Find all reports for this project that aren't rejected
  const projectReports = await VerificationReport.find({
    projectId: projectId,
    status: { $ne: 'Rejected' }
  });

  const uniqueMetrics = new Set();
  for (let i = 0; i < projectReports.length; i++) {
    const report = projectReports[i];
    for (let j = 0; j < report.metricVerifications.length; j++) {
      const metric = report.metricVerifications[j];
      if (metric.verified) {
        uniqueMetrics.add(metric.metricKey);
      }
    }
  }

  const verifiedKeysArray = Array.from(uniqueMetrics);
  const calculatedPercent = calcProgress(verifiedKeysArray);

  // Determine updated status
  let projectStatusText = 'InProgress';
  if (calculatedPercent === 100) {
    projectStatusText = 'Verified';
  }

  const updatedProject = await Project.findByIdAndUpdate(
    projectId,
    {
      verifiedMetrics: verifiedKeysArray,
      completionPercentage: calculatedPercent,
      status: projectStatusText
    },
    { new: true }
  );

  if (updatedProject) {
    // Sync with Progress details
    await Progress.findOneAndUpdate(
      { projectId: updatedProject._id },
      { 
        completionPercentage: calculatedPercent, 
        organisationId: updatedProject.organisationId 
      },
      { upsert: true }
    );

    // Auto-create a SalaryReport based on labourBudget progress
    const totalLabourBudget = updatedProject.labourBudget || 0;
    const currentReleased = updatedProject.releasedSalaryAmount || 0;
    const currentEligibleAmount = (calculatedPercent / 100) * totalLabourBudget;
    
    const incrementalBudgetAmount = currentEligibleAmount - currentReleased;

    if (incrementalBudgetAmount > 0) {
      await SalaryReport.create({
        projectId: updatedProject._id,
        organisationId: updatedProject.organisationId,
        workerCount: 0,
        workingDays: 0,
        salaryPerWorker: 0,
        totalSalary: incrementalBudgetAmount,
        status: 'Pending',
        submittedBy: updatedProject.createdBy
      });
    }
  }
}

// Site Engineer submits a verification/inspection report
const submitVerificationReport = async (req, res) => {
  try {
    const {
      projectId, dailyUpdateId, metricVerifications,
      gpsLat, gpsLng, gpsAddress, inspectionRemarks, actualWorkers, materialsUsed
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const orgId = getUserCompanyId(req);

    // Parse metricVerifications if it's sent as a string
    let parsedMetrics = [];
    if (typeof metricVerifications === 'string') {
      parsedMetrics = JSON.parse(metricVerifications);
    } else if (Array.isArray(metricVerifications)) {
      parsedMetrics = metricVerifications;
    }

    const photoPathsList = [];
    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        photoPathsList.push('/uploads/photos/' + req.files[i].filename);
      }
    }

    const newReport = await VerificationReport.create({
      projectId: projectId,
      organisationId: orgId,
      dailyUpdateId: dailyUpdateId || null,
      metricVerifications: parsedMetrics,
      gpsLat: gpsLat ? Number(gpsLat) : null,
      gpsLng: gpsLng ? Number(gpsLng) : null,
      gpsAddress: gpsAddress || '',
      inspectionDate: new Date(),
      sitePhotos: photoPathsList,
      inspectionRemarks: inspectionRemarks || '',
      actualWorkers: Number(actualWorkers) || 0,
      materialsUsed: materialsUsed || '',
      submittedBy: req.user._id
    });

    // Update project metrics and percentage
    await recalcProjectProgress(projectId);

    res.status(201).json(newReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting verification report' });
  }
};

// Fetch reports list based on roles
const getVerificationReports = async (req, res) => {
  try {
    let reportsFilter = {};
    const userRole = req.user.role;

    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      // Sees all verification reports
    } else if (userRole === 'Manager') {
      const ProjectModel = require('../models/Project');
      const myProjsList = await ProjectModel.find({ assignedManagers: req.user._id }).select('_id');
      const myProjIds = myProjsList.map(p => p._id);
      
      reportsFilter.projectId = { $in: myProjIds };
    } else if (userRole === 'Employee') {
      reportsFilter.submittedBy = req.user._id;
    } else if (userRole === 'Company') {
      reportsFilter.organisationId = getUserCompanyId(req);
    }

    if (req.query.projectId) {
      reportsFilter.projectId = req.query.projectId;
    }

    const reportsList = await VerificationReport.find(reportsFilter)
      .populate('projectId', 'name location')
      .populate('submittedBy', 'name email designation')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(reportsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching verification reports' });
  }
};

// Manager updates the verification report status
const updateReportStatus = async (req, res) => {
  try {
    const { status, managerRemarks } = req.body;
    if (!['ManagerApproved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be ManagerApproved or Rejected' });
    }

    const verificationReport = await VerificationReport.findById(req.params.id);
    if (!verificationReport) {
      return res.status(404).json({ message: 'Report not found' });
    }

    verificationReport.status = status;
    verificationReport.verifiedBy = req.user._id;
    verificationReport.managerRemarks = managerRemarks || '';
    await verificationReport.save();

    // Recalculate project progress since changes were made
    await recalcProjectProgress(verificationReport.projectId.toString());

    res.json(verificationReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating report status' });
  }
};

module.exports = {
  submitVerificationReport,
  getVerificationReports,
  updateReportStatus,
  updateVerificationReportStatus: updateReportStatus
};

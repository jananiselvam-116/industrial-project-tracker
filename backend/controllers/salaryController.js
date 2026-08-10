const SalaryReport = require('../models/SalaryReport');
const Project = require('../models/Project');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Submit a new salary report for workers
const submitSalaryReport = async (req, res) => {
  try {
    const { projectId, workerCount, workingDays, salaryPerWorker } = req.body;
    const legacyId = req.body.companyId; // backward compatibility fallback
    
    const calculatedTotal = Number(workerCount) * Number(workingDays) * Number(salaryPerWorker);
    const companyOrgId = getUserCompanyId(req);

    const createdReport = await SalaryReport.create({
      companyId: legacyId || projectId || null,
      projectId: projectId || null,
      organisationId: companyOrgId,
      workerCount: workerCount,
      workingDays: workingDays,
      salaryPerWorker: salaryPerWorker,
      totalSalary: calculatedTotal,
      submittedBy: req.user._id
    });

    res.status(201).json(createdReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting salary report' });
  }
};

// Fetch salary reports list based on roles
const getSalaryReports = async (req, res) => {
  try {
    let reportFilter = {};
    const userRole = req.user.role;

    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      // Government Admin sees all reports
    } else if (userRole === 'Manager') {
      const ProjectModel = require('../models/Project');
      const myProjs = await ProjectModel.find({ assignedManagers: req.user._id }).select('_id');
      const myIds = myProjs.map(p => p._id);
      
      reportFilter.projectId = { $in: myIds };
    } else if (userRole === 'Employee') {
      reportFilter.submittedBy = req.user._id;
    } else if (userRole === 'Company') {
      reportFilter.organisationId = getUserCompanyId(req);
    }

    const reportsList = await SalaryReport.find(reportFilter)
      .populate('companyId', 'companyName')
      .populate('projectId', 'projectName')
      .populate('submittedBy', 'name email designation')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(reportsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching salary reports' });
  }
};

// Update salary report status (Manager / Government releases/approves)
const updateSalaryReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const reportItem = await SalaryReport.findById(req.params.id);

    if (!reportItem) {
      return res.status(404).json({ message: 'Report not found' });
    }

    reportItem.status = status;
    reportItem.verifiedBy = req.user._id;
    await reportItem.save();

    // If released, update released salary amount on project details
    if (status === 'Released' && reportItem.projectId) {
      await Project.findByIdAndUpdate(reportItem.projectId, {
        $inc: { releasedSalaryAmount: reportItem.totalSalary }
      });
    }

    res.json(reportItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating status' });
  }
};

module.exports = {
  submitSalaryReport,
  getSalaryReports,
  updateSalaryReportStatus
};

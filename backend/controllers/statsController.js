const Organisation = require('../models/Organisation');
const Project = require('../models/Project');
const User = require('../models/User');
const Bill = require('../models/Bill');
const Tender = require('../models/Tender');
const TenderApplication = require('../models/TenderApplication');
const VerificationReport = require('../models/VerificationReport');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Fetch stats for Government / SuperAdmin
async function getGovernmentStats(req, res) {
  try {
    const totalTendersCount = await Tender.countDocuments();
    const activeTendersCount = await Tender.countDocuments({ status: 'Published' });
    const totalProjectsCount = await Project.countDocuments();
    const totalCompaniesCount = await Organisation.countDocuments({ isActive: true });
    const pendingApplicationsCount = await TenderApplication.countDocuments({ status: 'Applied' });

    const allProjectsList = await Project.find().lean();
    
    let inProgressCount = 0;
    let completedCount = 0;
    let delayedCount = 0;
    const nowTime = new Date();

    for (let i = 0; i < allProjectsList.length; i++) {
      const proj = allProjectsList[i];
      if (['InProgress', 'AssignedToManager', 'AssignedToEngineers'].includes(proj.status)) {
        inProgressCount++;
      }
      if (proj.status === 'Completed') {
        completedCount++;
      }
      if (proj.status !== 'Completed' && proj.expectedCompletionDate && new Date(proj.expectedCompletionDate) < nowTime) {
        delayedCount++;
      }
    }

    const approvedBillsList = await Bill.find({ status: 'ManagerApproved' }).lean();
    let totalPaymentsReleasedSum = 0;
    for (let j = 0; j < approvedBillsList.length; j++) {
      totalPaymentsReleasedSum += approvedBillsList[j].amount || 0;
    }

    const pendingBillsCount = await Bill.countDocuments({ status: 'CompanySubmitted' });
    const pendingReportsCount = await VerificationReport.countDocuments({ status: 'EmployeeSubmitted' });

    return res.json({
      totalTenders: totalTendersCount,
      activeTenders: activeTendersCount,
      totalProjects: totalProjectsCount,
      totalCompanies: totalCompaniesCount,
      inProgress: inProgressCount,
      completed: completedCount,
      delayed: delayedCount,
      pendingApplications: pendingApplicationsCount,
      pendingBills: pendingBillsCount,
      pendingReports: pendingReportsCount,
      totalPaymentsReleased: totalPaymentsReleasedSum
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching government stats' });
  }
}

// Fetch stats for Project Managers
async function getManagerStats(req, res) {
  try {
    const myProjectsList = await Project.find({ assignedManagers: req.user._id }).lean();
    const myProjIds = myProjectsList.map(p => p._id);

    const pendingReportsCount = await VerificationReport.countDocuments({ 
      projectId: { $in: myProjIds }, 
      status: 'EmployeeSubmitted' 
    });

    const billsList = await Bill.find({ projectId: { $in: myProjIds } }).lean();

    let totalProjCount = myProjectsList.length;
    let inProgressCount = 0;
    let completedCount = 0;
    for (let i = 0; i < myProjectsList.length; i++) {
      const p = myProjectsList[i];
      if (p.status === 'InProgress') {
        inProgressCount++;
      }
      if (p.status === 'Completed') {
        completedCount++;
      }
    }

    let pendingBillsCount = 0;
    let approvedBillsCount = 0;
    for (let j = 0; j < billsList.length; j++) {
      const b = billsList[j];
      if (b.status === 'CompanySubmitted' || b.status === 'EmployeeVerified') {
        pendingBillsCount++;
      }
      if (b.status === 'ManagerApproved') {
        approvedBillsCount++;
      }
    }

    res.json({
      projects: {
        total: totalProjCount,
        inProgress: inProgressCount,
        completed: completedCount
      },
      pendingReports: pendingReportsCount,
      bills: {
        pending: pendingBillsCount,
        approved: approvedBillsCount
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching manager stats' });
  }
}

// Main Stats Router API
const getStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      return await getGovernmentStats(req, res);
    }

    if (userRole === 'Manager') {
      return await getManagerStats(req, res);
    }

    // Otherwise, fetch stats for Company / Employee
    const orgId = getUserCompanyId(req);
    const myProjectsList = await Project.find({ organisationId: orgId }).lean();
    const myBillsList = await Bill.find({ organisationId: orgId }).lean();

    let totalProjectsCount = myProjectsList.length;
    let inProgressProjectsCount = 0;
    let completedProjectsCount = 0;
    let totalProgressSum = 0;

    for (let i = 0; i < myProjectsList.length; i++) {
      const proj = myProjectsList[i];
      if (proj.status === 'InProgress') {
        inProgressProjectsCount++;
      }
      if (proj.status === 'Completed') {
        completedProjectsCount++;
      }
      totalProgressSum += proj.completionPercentage || 0;
    }

    const avgProgressVal = totalProjectsCount > 0 ? Math.round(totalProgressSum / totalProjectsCount) : 0;

    let totalBillsCount = myBillsList.length;
    let approvedBillsCount = 0;
    let pendingBillsCount = 0;
    let totalPaidSum = 0;

    for (let j = 0; j < myBillsList.length; j++) {
      const bill = myBillsList[j];
      if (bill.status === 'ManagerApproved') {
        approvedBillsCount++;
        totalPaidSum += bill.amount || 0;
      }
      if (bill.status === 'CompanySubmitted') {
        pendingBillsCount++;
      }
    }

    res.json({
      projects: {
        total: totalProjectsCount,
        inProgress: inProgressProjectsCount,
        completed: completedProjectsCount,
        avgProgress: avgProgressVal
      },
      bills: {
        total: totalBillsCount,
        approved: approvedBillsCount,
        pending: pendingBillsCount,
        totalPaid: totalPaidSum
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

module.exports = {
  getStats,
  getGovernmentStats: getStats
};

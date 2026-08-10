const Organisation = require('../models/Organisation');
const User = require('../models/User');
const Project = require('../models/Project');
const Bill = require('../models/Bill');
const SalaryReport = require('../models/SalaryReport');

// Fetch all organisations (SuperAdmin/Government dashboard)
const getOrganisations = async (req, res) => {
  try {
    const organisationsList = await Organisation.find()
      .populate('ownerUserId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const finalData = [];
    for (let i = 0; i < organisationsList.length; i++) {
      const currentOrg = organisationsList[i];
      const projectCount = await Project.countDocuments({ organisationId: currentOrg._id });
      const userCount = await User.countDocuments({ companyId: currentOrg._id });

      const orgObject = currentOrg.toObject();
      orgObject.projectCount = projectCount;
      orgObject.userCount = userCount;
      
      finalData.push(orgObject);
    }

    res.json(finalData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching organisations' });
  }
};

// Fetch details of a single organisation
const getOrganisation = async (req, res) => {
  try {
    const singleOrg = await Organisation.findById(req.params.id)
      .populate('ownerUserId', 'name email phone')
      .populate('createdBy', 'name email');

    if (!singleOrg) {
      return res.status(404).json({ message: 'Organisation not found' });
    }
    res.json(singleOrg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching organisation' });
  }
};

// Create a new organisation (Government/SuperAdmin)
const createOrganisation = async (req, res) => {
  try {
    const orgData = req.body;
    orgData.createdBy = req.user._id;
    orgData.isActive = true;

    const createdOrg = await Organisation.create(orgData);
    res.status(201).json(createdOrg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating organisation' });
  }
};

// Update organisation details
const updateOrganisation = async (req, res) => {
  try {
    const updatedOrg = await Organisation.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedOrg) {
      return res.status(404).json({ message: 'Organisation not found' });
    }
    res.json(updatedOrg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating organisation' });
  }
};

// Activate organisation
const activateOrg = async (req, res) => {
  try {
    const activatedOrg = await Organisation.findByIdAndUpdate(
      req.params.id, 
      { isActive: true }, 
      { new: true }
    );
    if (!activatedOrg) {
      return res.status(404).json({ message: 'Organisation not found' });
    }
    res.json({ message: 'Organisation activated', org: activatedOrg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error activating organisation' });
  }
};

// Deactivate organisation
const deactivateOrg = async (req, res) => {
  try {
    const deactivatedOrg = await Organisation.findByIdAndUpdate(
      req.params.id, 
      { isActive: false }, 
      { new: true }
    );
    if (!deactivatedOrg) {
      return res.status(404).json({ message: 'Organisation not found' });
    }
    res.json({ message: 'Organisation deactivated', org: deactivatedOrg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deactivating organisation' });
  }
};

// Fetch specific statistics for a single organisation
const getOrgStats = async (req, res) => {
  try {
    const orgId = req.params.id;
    const projectsList = await Project.find({ organisationId: orgId });
    const usersList = await User.find({ companyId: orgId }).select('-password');
    const billsList = await Bill.find({ organisationId: orgId });
    const salariesList = await SalaryReport.find({ organisationId: orgId });

    let approvedExpensesSum = 0;
    for (let i = 0; i < billsList.length; i++) {
      const bill = billsList[i];
      if (bill.status === 'ManagerApproved') {
        approvedExpensesSum += bill.amount || 0;
      }
    }

    let approvedSalariesSum = 0;
    for (let j = 0; j < salariesList.length; j++) {
      const salary = salariesList[j];
      if (salary.status === 'ManagerApproved') {
        approvedSalariesSum += salary.totalSalary || 0;
      }
    }

    const totalSpendSum = approvedExpensesSum + approvedSalariesSum;

    let notStartedCount = 0;
    let inProgressCount = 0;
    let delayedCount = 0;
    let completedCount = 0;

    for (let k = 0; k < projectsList.length; k++) {
      const pStatus = projectsList[k].projectStatus;
      if (pStatus === 'Not Started') notStartedCount++;
      if (pStatus === 'In Progress') inProgressCount++;
      if (pStatus === 'Delayed') delayedCount++;
      if (pStatus === 'Completed') completedCount++;
    }

    let managersCount = 0;
    let employeesCount = 0;

    for (let m = 0; m < usersList.length; m++) {
      const uRole = usersList[m].role;
      if (uRole === 'Manager') managersCount++;
      if (uRole === 'Employee') employeesCount++;
    }

    res.json({
      projects: {
        total: projectsList.length,
        notStarted: notStartedCount,
        inProgress: inProgressCount,
        delayed: delayedCount,
        completed: completedCount
      },
      users: {
        total: usersList.length,
        managers: managersCount,
        employees: employeesCount
      },
      financials: {
        totalExpenses: approvedExpensesSum,
        totalSalaries: approvedSalariesSum,
        totalSpend: totalSpendSum
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching org stats' });
  }
};

module.exports = {
  getOrganisations,
  getOrganisation,
  createOrganisation,
  updateOrganisation,
  activateOrg,
  deactivateOrg,
  getOrgStats
};

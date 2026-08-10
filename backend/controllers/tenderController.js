const Tender = require('../models/Tender');
const TenderApplication = require('../models/TenderApplication');
const Project = require('../models/Project');
const User = require('../models/User');

// Get all tenders based on role
const getTenders = async (req, res) => {
  try {
    let filterObj = {};

    // Company user can only see published tenders
    if (req.user.role === 'Company') {
      filterObj.status = 'Published';
    }

    const tendersList = await Tender.find(filterObj)
      .populate('createdBy', 'name')
      .populate('assignedManager', 'name email')
      .populate('awardedCompany', 'name')
      .sort({ createdAt: -1 });

    res.json(tendersList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching tenders' });
  }
};

// Get details of a single tender
const getTender = async (req, res) => {
  try {
    const singleTender = await Tender.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('assignedManager', 'name email phone')
      .populate('awardedCompany', 'name contactEmail');

    if (!singleTender) {
      return res.status(404).json({ message: 'Tender not found' });
    }

    // find number of applications for this tender
    const countApps = await TenderApplication.countDocuments({ tenderId: singleTender._id });

    // convert to object and add applicationCount
    const tenderObj = singleTender.toObject();
    tenderObj.applicationCount = countApps;

    res.json(tenderObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching tender' });
  }
};

// Government creates a new tender
const createTender = async (req, res) => {
  try {
    const {
      projectName, projectCategory, budget, labourBudget, location,
      startDate, expectedCompletionDate, description,
      eligibilityCriteria, requiredDocuments
    } = req.body;

    if (!projectName || !budget || !labourBudget || !location || !startDate || !expectedCompletionDate) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const newTender = await Tender.create({
      projectName: projectName,
      projectCategory: projectCategory || 'Government Office Building',
      budget: Number(budget),
      labourBudget: Number(labourBudget),
      location: location,
      startDate: new Date(startDate),
      expectedCompletionDate: new Date(expectedCompletionDate),
      description: description || '',
      eligibilityCriteria: eligibilityCriteria || '',
      requiredDocuments: requiredDocuments || [],
      status: 'Draft',
      createdBy: req.user._id
    });

    res.status(201).json(newTender);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating tender' });
  }
};

// Government updates a tender
const updateTender = async (req, res) => {
  try {
    const tenderToUpdate = await Tender.findById(req.params.id);
    if (!tenderToUpdate) {
      return res.status(404).json({ message: 'Tender not found' });
    }

    const fields = [
      'projectName', 'projectCategory', 'budget', 'labourBudget', 'location',
      'startDate', 'expectedCompletionDate', 'description',
      'eligibilityCriteria', 'requiredDocuments', 'status'
    ];

    // Update fields that are present in the request body
    for (let i = 0; i < fields.length; i++) {
      const currentField = fields[i];
      if (req.body[currentField] !== undefined) {
        tenderToUpdate[currentField] = req.body[currentField];
      }
    }

    const savedTender = await tenderToUpdate.save();
    res.json(savedTender);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating tender' });
  }
};

// Government gets all applications for a specific tender
const getApplicationsForTender = async (req, res) => {
  try {
    const appsList = await TenderApplication.find({ tenderId: req.params.id })
      .populate('organisationId', 'name registrationNo contactEmail contactPhone')
      .populate('companyUserId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(appsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};

// Government reviews a company application (approve, reject, request docs)
const reviewApplication = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const allowedStatuses = ['Approved', 'Rejected', 'UnderReview', 'DocumentsRequested'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const singleApp = await TenderApplication.findById(req.params.appId)
      .populate('tenderId')
      .populate('organisationId', 'name');

    if (!singleApp) {
      return res.status(404).json({ message: 'Application not found' });
    }

    singleApp.status = status;
    singleApp.reviewNotes = reviewNotes || '';
    await singleApp.save();

    // If approved, mark the tender as closed and award it to the company
    if (status === 'Approved') {
      await Tender.findByIdAndUpdate(singleApp.tenderId._id, {
        awardedCompany: singleApp.organisationId._id,
        awardedApplication: singleApp._id,
        status: 'Closed'
      });

      // Reject all other applications for this tender
      await TenderApplication.updateMany(
        { 
          tenderId: singleApp.tenderId._id, 
          _id: { $ne: singleApp._id } 
        },
        { 
          status: 'Rejected', 
          reviewNotes: 'Another company was selected for this tender.' 
        }
      );
    }

    res.json({ message: 'Application ' + status, application: singleApp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error reviewing application' });
  }
};

// Assign manager to approved application and create project
const assignManagerAndCreateProject = async (req, res) => {
  try {
    const { managerId } = req.body;
    const appData = await TenderApplication.findById(req.params.appId).populate('tenderId');

    if (!appData) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (appData.status !== 'Approved') {
      return res.status(400).json({ message: 'Application must be approved first' });
    }

    const assignedManagerUser = await User.findById(managerId);
    if (!assignedManagerUser || assignedManagerUser.role !== 'Manager') {
      return res.status(400).json({ message: 'Invalid manager ID' });
    }

    const tenderInfo = appData.tenderId;

    // Create the project entry
    const createdProject = await Project.create({
      tenderId: tenderInfo._id,
      tenderApplicationId: appData._id,
      organisationId: appData.organisationId,
      name: tenderInfo.projectName,
      category: tenderInfo.projectCategory,
      location: tenderInfo.location,
      budget: tenderInfo.budget,
      labourBudget: tenderInfo.labourBudget,
      investmentCommitment: appData.bidAmount,
      startDate: tenderInfo.startDate,
      expectedCompletionDate: tenderInfo.expectedCompletionDate,
      description: tenderInfo.description || '',
      status: 'AssignedToManager',
      assignedManagers: [managerId],
      createdBy: req.user._id,
      companyName: ''
    });

    // Update the tender manager
    await Tender.findByIdAndUpdate(tenderInfo._id, { assignedManager: managerId });

    res.status(201).json({ message: 'Manager assigned and project created', project: createdProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error assigning manager' });
  }
};

// Release project final payment
const releasePayment = async (req, res) => {
  try {
    const foundProject = await Project.findOne({ tenderId: req.params.id });
    if (!foundProject) {
      return res.status(404).json({ message: 'Project not found for this tender' });
    }

    if (foundProject.completionPercentage < 100) {
      return res.status(400).json({ message: 'Project must be 100% complete before releasing payment' });
    }

    foundProject.paymentStatus = 'Released';
    foundProject.paymentReleasedAt = new Date();
    foundProject.paymentReleasedBy = req.user._id;
    foundProject.completionCertificateIssued = true;
    foundProject.status = 'Completed';
    await foundProject.save();

    res.json({ message: 'Payment released and project marked as completed', project: foundProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error releasing payment' });
  }
};

module.exports = {
  getTenders,
  getTender,
  createTender,
  updateTender,
  getApplicationsForTender,
  reviewApplication,
  assignManagerAndCreateProject,
  releasePayment
};

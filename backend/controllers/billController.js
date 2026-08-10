const Bill = require('../models/Bill');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Upload a new bill
const uploadBill = async (req, res) => {
  try {
    const { projectId, billNumber, invoiceNumber, issueDate, billName, amount, billDetails, remarks } = req.body;
    const legacyId = req.body.companyId; // fallback support for older fields

    if (!billName) {
      return res.status(400).json({ message: 'Bill name is required' });
    }
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const orgId = getUserCompanyId(req);

    const billPayload = {
      companyId: legacyId || projectId || null,
      projectId: projectId || null,
      organisationId: orgId,
      billNumber: billNumber || undefined,
      invoiceNumber: invoiceNumber || undefined,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      billName: billName,
      amount: Number(amount),
      billDetails: billDetails || '',
      remarks: remarks || '',
      status: 'CompanySubmitted',
      uploadedBy: req.user._id
    };

    if (req.file) {
      billPayload.billFile = '/uploads/bills/' + req.file.filename;
    }

    const newBill = await Bill.create(billPayload);
    res.status(201).json(newBill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting bill' });
  }
};

// Fetch list of bills depending on user role
const getBills = async (req, res) => {
  try {
    let billFilter = {};
    const userRole = req.user.role;

    if (userRole === 'Government' || userRole === 'SuperAdmin') {
      // Sees all bills
    } else if (userRole === 'Manager') {
      const Project = require('../models/Project');
      const myProjsList = await Project.find({ assignedManagers: req.user._id }).select('_id');
      const myProjIds = myProjsList.map(p => p._id);
      
      billFilter.projectId = { $in: myProjIds };
    } else if (userRole === 'Employee') {
      const Project = require('../models/Project');
      const myProjsList = await Project.find({ assignedEngineers: req.user._id }).select('_id');
      const myProjIds = myProjsList.map(p => p._id);
      
      billFilter.projectId = { $in: myProjIds };
    } else if (userRole === 'Company') {
      billFilter.organisationId = getUserCompanyId(req);
    }

    // Specifying a project filter if present in query params
    if (req.query.projectId) {
      billFilter.projectId = req.query.projectId;
    }

    const billsList = await Bill.find(billFilter)
      .populate('companyId', 'companyName projectName')
      .populate('projectId', 'name location')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(billsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching bills' });
  }
};

// Site Engineer verifies bill details
const verifyBill = async (req, res) => {
  try {
    const { actualCostCalculated, remarks } = req.body;
    const targetBill = await Bill.findById(req.params.id);

    if (!targetBill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (actualCostCalculated !== undefined) {
      targetBill.actualCostCalculated = Number(actualCostCalculated);
    }

    targetBill.status = 'EmployeeVerified';
    
    // Add verification details to history array
    if (!targetBill.verificationHistory) {
      targetBill.verificationHistory = [];
    }

    targetBill.verificationHistory.push({
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      remarks: remarks || targetBill.remarks || '',
      status: 'EmployeeVerified'
    });

    const savedBill = await targetBill.save();
    res.json(savedBill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error verifying bill' });
  }
};

// Manager approves or rejects the verified bill
const changeBillStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!['ManagerApproved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid bill status' });
    }

    const targetBill = await Bill.findById(req.params.id);
    if (!targetBill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    targetBill.status = status;
    
    // Add approval details to history array
    if (!targetBill.approvalHistory) {
      targetBill.approvalHistory = [];
    }

    targetBill.approvalHistory.push({
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: remarks || '',
      status: status
    });

    const savedBill = await targetBill.save();
    res.json(savedBill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating bill status' });
  }
};

module.exports = {
  uploadBill,
  getBills,
  verifyBill,
  changeBillStatus
};

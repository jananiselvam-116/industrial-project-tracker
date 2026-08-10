const TenderApplication = require('../models/TenderApplication');
const Tender = require('../models/Tender');

// helper function to extract user's company id
function findUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Company submits application for a tender
const applyForTender = async (req, res) => {
  try {
    const { tenderId, bidAmount, companyProfile, experience, previousProjects } = req.body;
    const orgId = findUserCompanyId(req);

    if (!tenderId || !bidAmount) {
      return res.status(400).json({ message: 'Tender ID and bid amount are required' });
    }

    // check if the tender exists and is open (status is Published)
    const activeTender = await Tender.findById(tenderId);
    if (!activeTender) {
      return res.status(404).json({ message: 'Tender not found' });
    }
    if (activeTender.status !== 'Published') {
      return res.status(400).json({ message: 'This tender is not open for applications' });
    }

    // check duplicate application
    const previousApp = await TenderApplication.findOne({ tenderId: tenderId, organisationId: orgId });
    if (previousApp) {
      return res.status(400).json({ message: 'You have already applied for this tender' });
    }

    const documentFilePaths = {
      registrationCertificate: '',
      gstCertificate: '',
      otherDocuments: []
    };

    // check uploaded files
    if (req.files) {
      if (req.files.registrationCertificate && req.files.registrationCertificate[0]) {
        documentFilePaths.registrationCertificate = '/uploads/documents/' + req.files.registrationCertificate[0].filename;
      }
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        documentFilePaths.gstCertificate = '/uploads/documents/' + req.files.gstCertificate[0].filename;
      }
      if (req.files.otherDocuments) {
        const otherFiles = req.files.otherDocuments;
        for (let i = 0; i < otherFiles.length; i++) {
          documentFilePaths.otherDocuments.push('/uploads/documents/' + otherFiles[i].filename);
        }
      }
    }

    const newApplication = await TenderApplication.create({
      tenderId: tenderId,
      organisationId: orgId,
      companyUserId: req.user._id,
      bidAmount: Number(bidAmount),
      companyProfile: companyProfile || '',
      experience: experience || '',
      previousProjects: previousProjects || '',
      documents: documentFilePaths,
      status: 'Applied'
    });

    res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting application' });
  }
};

// Company fetches their own applications list
const getMyApplications = async (req, res) => {
  try {
    const orgId = findUserCompanyId(req);
    const myAppsList = await TenderApplication.find({ organisationId: orgId })
      .populate('tenderId', 'projectName tenderId projectCategory budget location status')
      .sort({ createdAt: -1 });

    res.json(myAppsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching your applications' });
  }
};

// Get detail of a specific application
const getApplicationDetail = async (req, res) => {
  try {
    const appDetail = await TenderApplication.findById(req.params.id)
      .populate('tenderId', 'projectName tenderId budget location startDate expectedCompletionDate')
      .populate('organisationId', 'name registrationNo contactEmail contactPhone')
      .populate('companyUserId', 'name email phone');

    if (!appDetail) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // safety check: Company users can only see their own applications
    const userOrgId = findUserCompanyId(req);
    if (req.user.role === 'Company') {
      const appOrgId = appDetail.organisationId?._id || appDetail.organisationId;
      if (appOrgId.toString() !== userOrgId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(appDetail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching application' });
  }
};

module.exports = {
  applyForTender,
  getMyApplications,
  getApplicationDetail
};

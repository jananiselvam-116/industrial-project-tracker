const Document = require('../models/Document');
const Company = require('../models/Company');

// Upload document details
const uploadDocument = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Document file is required' });
    }

    const companyProj = await Company.findById(companyId);
    if (!companyProj) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const createdDoc = await Document.create({
      companyId: companyId,
      filePath: '/uploads/documents/' + req.file.filename,
      originalName: req.file.originalname,
      uploadedBy: req.user._id
    });

    res.status(201).json(createdDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error uploading document' });
  }
};

// Fetch list of uploaded documents
const getDocuments = async (req, res) => {
  try {
    const filterQuery = {};

    const docsList = await Document.find(filterQuery)
      .populate('companyId', 'companyName')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
      
    res.json(docsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching documents' });
  }
};

module.exports = {
  uploadDocument,
  getDocuments
};

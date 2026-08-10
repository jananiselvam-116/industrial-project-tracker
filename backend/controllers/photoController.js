const Photo = require('../models/Photo');
const Company = require('../models/Company');

// Upload photo details
const uploadPhoto = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }

    const companyProj = await Company.findById(companyId);
    if (!companyProj) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Auth check: Company users can only upload for companies they own/created
    const userRole = req.user.role;
    if (userRole === 'Company') {
      const isOwner = 
        companyProj.companyUser?.toString() === req.user._id.toString() ||
        companyProj.createdBy?.toString() === req.user._id.toString();

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: cannot upload photo for this company' });
      }
    }

    const createdPhoto = await Photo.create({
      companyId: companyId,
      photoUrl: '/uploads/photos/' + req.file.filename,
      uploadedBy: req.user._id
    });

    res.status(201).json(createdPhoto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error uploading photo' });
  }
};

// Fetch list of uploaded photos
const getPhotos = async (req, res) => {
  try {
    const photoFilters = {};
    const userRole = req.user.role;

    if (userRole === 'Company') {
      const companyIds = await Company.find({
        $or: [
          { createdBy: req.user._id }, 
          { companyUser: req.user._id }
        ]
      }).distinct('_id');
      
      photoFilters.companyId = { $in: companyIds };
    }

    const photosList = await Photo.find(photoFilters)
      .populate('companyId', 'companyName')
      .populate('uploadedBy', 'name');
      
    res.json(photosList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching photos' });
  }
};

module.exports = {
  uploadPhoto,
  getPhotos
};

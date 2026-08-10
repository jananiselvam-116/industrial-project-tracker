const DailyUpdate = require('../models/DailyUpdate');
const Project = require('../models/Project');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Fetch list of daily updates
const getDailyUpdates = async (req, res) => {
  try {
    let updateFilter = {};

    if (req.query.projectId) {
      updateFilter.projectId = req.query.projectId;
    }

    const userRole = req.user.role;
    if (userRole !== 'Government' && userRole !== 'SuperAdmin') {
      if (userRole === 'Manager') {
        const myProjectsList = await Project.find({ assignedManagers: req.user._id }).select('_id');
        const projectIds = myProjectsList.map(p => p._id);
        
        updateFilter.projectId = { $in: projectIds };
        
        // override if specific project is requested in query params
        if (req.query.projectId) {
          updateFilter.projectId = req.query.projectId;
        }
      } else if (userRole === 'Employee') {
        updateFilter.submittedBy = req.user._id;
      } else {
        updateFilter.organisationId = getUserCompanyId(req);
      }
    }

    const updatesList = await DailyUpdate.find(updateFilter)
      .populate('submittedBy', 'name email designation')
      .populate('projectId', 'name location')
      .populate('reviewedBy', 'name')
      .sort({ date: -1 });

    res.json(updatesList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching daily updates' });
  }
};

// Company submits daily progress update
const createDailyUpdate = async (req, res) => {
  try {
    const orgId = getUserCompanyId(req);
    const {
      projectId, date, workDone, issues,
      workerCount, dailyExpenses, materialsUsed, claimedMetrics
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    let parsedMetricsList = [];
    if (typeof claimedMetrics === 'string') {
      try {
        parsedMetricsList = JSON.parse(claimedMetrics);
      } catch (e) {
        parsedMetricsList = [];
      }
    } else if (Array.isArray(claimedMetrics)) {
      parsedMetricsList = claimedMetrics;
    }

    const sitePhotoPaths = [];
    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        sitePhotoPaths.push('/uploads/photos/' + req.files[i].filename);
      }
    }

    const createdUpdate = await DailyUpdate.create({
      projectId: projectId,
      organisationId: orgId,
      submittedBy: req.user._id,
      date: date ? new Date(date) : new Date(),
      claimedMetrics: parsedMetricsList,
      workDone: workDone || '',
      workerCount: Number(workerCount) || 0,
      dailyExpenses: Number(dailyExpenses) || 0,
      materialsUsed: materialsUsed || '',
      issues: issues || '',
      sitePhotos: sitePhotoPaths
    });

    const populated = await createdUpdate.populate('submittedBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating daily update' });
  }
};

// Manager reviews the submitted daily update
const reviewDailyUpdate = async (req, res) => {
  try {
    const updatedRecord = await DailyUpdate.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Reviewed', 
        reviewedBy: req.user._id 
      },
      { new: true }
    );
    if (!updatedRecord) {
      return res.status(404).json({ message: 'Update not found' });
    }
    res.json(updatedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error reviewing update' });
  }
};

module.exports = {
  getDailyUpdates,
  createDailyUpdate,
  reviewDailyUpdate
};

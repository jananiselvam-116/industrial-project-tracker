const mongoose = require('mongoose');

// daily work update submitted by the company/engineer for a project
const dailyUpdateSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // list of construction metric keys the company claims are completed
  claimedMetrics: [{ type: String }],
  workDone: { type: String, trim: true, default: '' },
  workerCount: { type: Number, default: 0 },
  dailyExpenses: { type: Number, default: 0 },
  materialsUsed: { type: String, trim: true, default: '' },
  issues: { type: String, trim: true, default: '' },
  sitePhotos: [{ type: String }],
  uploadedBills: [{ type: String }],
  status: {
    type: String,
    enum: ['Submitted', 'Reviewed'],
    default: 'Submitted'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyUpdate', dailyUpdateSchema);

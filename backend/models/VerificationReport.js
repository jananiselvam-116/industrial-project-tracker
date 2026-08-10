const mongoose = require('mongoose');

// Site engineer submits an inspection/verification report for a project
const verificationReportSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation'
  },
  dailyUpdateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyUpdate',
    default: null
  },

  // each item: { metricKey: 'excavation', verified: true, remarks: '...' }
  metricVerifications: [
    {
      metricKey: { type: String, required: true },
      verified: { type: Boolean, default: false },
      remarks: { type: String, default: '' }
    }
  ],

  // GPS location of engineer on site
  gpsLat: { type: Number, default: null },
  gpsLng: { type: Number, default: null },
  gpsAddress: { type: String, trim: true, default: '' },

  inspectionDate: { type: Date, default: Date.now },
  sitePhotos: [{ type: String }],
  inspectionRemarks: { type: String, trim: true, default: '' },
  actualWorkers: { type: Number, default: 0 },
  materialsUsed: { type: String, trim: true, default: '' },

  billAmount: { type: Number, default: null },
  actualCostVerified: { type: Number, default: null },

  status: {
    type: String,
    enum: ['EmployeeSubmitted', 'ManagerApproved', 'Rejected'],
    default: 'EmployeeSubmitted'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  managerRemarks: { type: String, trim: true, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('VerificationReport', verificationReportSchema);

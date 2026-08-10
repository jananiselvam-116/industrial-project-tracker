const mongoose = require('mongoose');

// A project is created from an approved tender
const projectSchema = new mongoose.Schema({
  // link back to the tender that created this project
  tenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    default: null
  },
  tenderApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderApplication',
    default: null
  },
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Government Office Building',
      'School Building',
      'Hospital Building',
      'Collector Office',
      'Public Service Building'
    ],
    default: 'Government Office Building'
  },
  location: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  labourBudget: {
    type: Number,
    default: 0
  },
  releasedSalaryAmount: {
    type: Number,
    default: 0
  },
  investmentCommitment: {
    type: Number,
    default: 0
  },
  employmentCommitment: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  expectedCompletionDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['PendingAssignment', 'AssignedToManager', 'AssignedToEngineers', 'InProgress', 'Verified', 'Completed', 'Closed'],
    default: 'PendingAssignment'
  },
  // progress is calculated from verified construction metrics (out of 30)
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  verifiedMetrics: [{ type: String }],
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Released'],
    default: 'Pending'
  },
  paymentReleasedAt: {
    type: Date,
    default: null
  },
  paymentReleasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completionCertificateIssued: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  assignedManagers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedEngineers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // kept for backward compatibility
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  approvalFiles: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

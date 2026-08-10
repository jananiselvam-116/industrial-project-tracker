const mongoose = require('mongoose');

// Tender is created by the Government for construction projects
const tenderSchema = new mongoose.Schema({
  tenderId: {
    type: String,
    unique: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectCategory: {
    type: String,
    required: true,
    enum: [
      'Government Office Building',
      'School Building',
      'Hospital Building',
      'Collector Office',
      'Public Service Building'
    ]
  },
  budget: {
    type: Number,
    required: true
  },
  labourBudget: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
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
  eligibilityCriteria: {
    type: String,
    trim: true,
    default: ''
  },
  requiredDocuments: [{ type: String }],
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Closed', 'Cancelled'],
    default: 'Draft'
  },
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  awardedCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    default: null
  },
  awardedApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderApplication',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// auto-generate a unique tender ID like TND-2024-001
tenderSchema.pre('save', async function(next) {
  if (!this.tenderId) {
    const count = await mongoose.model('Tender').countDocuments();
    const year = new Date().getFullYear();
    this.tenderId = 'TND-' + year + '-' + String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Tender', tenderSchema);

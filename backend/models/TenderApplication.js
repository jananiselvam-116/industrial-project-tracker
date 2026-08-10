const mongoose = require('mongoose');

// when a company submits an application for a tender
const tenderApplicationSchema = new mongoose.Schema({
  tenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  companyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bidAmount: {
    type: Number,
    required: true
  },
  companyProfile: {
    type: String,
    trim: true,
    default: ''
  },
  experience: {
    type: String,
    trim: true,
    default: ''
  },
  previousProjects: {
    type: String,
    trim: true,
    default: ''
  },
  // uploaded documents
  documents: {
    registrationCertificate: { type: String, default: '' },
    gstCertificate: { type: String, default: '' },
    otherDocuments: [{ type: String }]
  },
  status: {
    type: String,
    enum: ['Applied', 'UnderReview', 'Approved', 'Rejected', 'DocumentsRequested'],
    default: 'Applied'
  },
  reviewNotes: {
    type: String,
    trim: true,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('TenderApplication', tenderApplicationSchema);

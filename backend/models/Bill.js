const mongoose = require('mongoose');

// Bill submitted by a company for expenses on a project
const billSchema = new mongoose.Schema({
  // both legacy and new references kept for compatibility
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },

  billNumber: { type: String, trim: true },
  invoiceNumber: { type: String, trim: true },
  issueDate: { type: Date },

  billName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  billDetails: {
    type: String,
    trim: true,
    default: ''
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  actualCostCalculated: { type: Number },
  billFile: { type: String },

  // history of who verified this bill
  verificationHistory: [
    {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date, default: Date.now },
      remarks: { type: String, trim: true, default: '' },
      status: { type: String, enum: ['EmployeeVerified'], default: 'EmployeeVerified' }
    }
  ],

  // history of who approved/rejected
  approvalHistory: [
    {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date, default: Date.now },
      remarks: { type: String, trim: true, default: '' },
      status: { type: String, enum: ['ManagerApproved', 'Rejected'] }
    }
  ],

  status: {
    type: String,
    enum: ['CompanySubmitted', 'EmployeeVerified', 'ManagerApproved', 'Rejected'],
    default: 'CompanySubmitted'
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);

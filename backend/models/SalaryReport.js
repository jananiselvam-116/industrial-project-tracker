const mongoose = require('mongoose');

// Salary report submitted by site engineer
const salaryReportSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },

  workerCount: { type: Number, required: true },
  workingDays: { type: Number, required: true },
  salaryPerWorker: { type: Number, required: true },
  totalSalary: { type: Number, required: true },

  status: {
    type: String,
    enum: ['Pending', 'EmployeeSubmitted', 'ManagerApproved', 'Rejected', 'Released'],
    default: 'EmployeeSubmitted'
  },

  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('SalaryReport', salaryReportSchema);

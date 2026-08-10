const mongoose = require('mongoose');

// Legacy company model - kept for backward compatibility with old routes
const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  projectName: { type: String, trim: true, default: '' },
  investmentCommitted: { type: Number, default: 0 },
  expense: { type: Number, default: 0 },
  employeesExpected: { type: Number, default: 0 },
  deadline: { type: Date },
  projectStatus: {
    type: String,
    enum: ['Not Started', 'Started', 'Ongoing', 'Completed', 'Delayed'],
    default: 'Not Started'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companyUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEngineers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);

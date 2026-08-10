const mongoose = require('mongoose');

// tracks investment and completion progress for a project
const progressSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
  investmentSpent: { type: Number, default: 0 },
  employeesCurrent: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);

const mongoose = require('mongoose');

// Organisation = the construction company that applies for tenders
const orgSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  registrationNo: {
    type: String,
    trim: true,
    default: ''
  },
  industry: {
    type: String,
    enum: ['Construction', 'Infrastructure', 'Real Estate', 'Industrial', 'Mining', 'Oil & Gas', 'Other'],
    default: 'Construction'
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false  // Government activates after registration
  },
  plan: {
    type: String,
    enum: ['Free', 'Basic', 'Professional', 'Enterprise'],
    default: 'Free'
  },
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Organisation', orgSchema);

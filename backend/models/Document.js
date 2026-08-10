const mongoose = require('mongoose');

// document uploaded by a company (registration cert, progress docs, etc.)
const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['initial', 'progress', 'inspection'],
    default: 'progress'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  filePath: { type: String, required: true },
  originalName: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  geoLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  uploadedDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);

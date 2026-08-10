const multer = require('multer');
const path = require('path');

// helper to set up disk storage for a given folder
function makeStorage(folder) {
  return multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, folder);
    },
    filename: function(req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
}

// only allow common file types
function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|pdf|doc|docx|txt/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image, PDF, and document files are allowed'), false);
  }
}

const billUpload = multer({ storage: makeStorage('uploads/bills'), fileFilter });
const photoUpload = multer({ storage: makeStorage('uploads/photos'), fileFilter });
const documentUpload = multer({ storage: makeStorage('uploads/documents'), fileFilter });

module.exports = { billUpload, photoUpload, documentUpload };

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getBusinessSettings,
  updateBusinessSettings,
  uploadBusinessLogo,
} = require('../controllers/businessSettingsController');

// Multer storage configuration for business logo uploads
const businessUploadDir = path.join(__dirname, '../../uploads/business');
if (!fs.existsSync(businessUploadDir)) {
  fs.mkdirSync(businessUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, businessUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `logo-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files (${allowed.join(', ')}) are allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get('/', authenticate, getBusinessSettings);
router.put('/', authenticate, requireAdmin, updateBusinessSettings);
router.post('/logo', authenticate, requireAdmin, upload.single('logo'), uploadBusinessLogo);

module.exports = router;

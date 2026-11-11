const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const documents = require('../controllers/contractDocumentController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/:id/document', authenticate, requireAdmin, documents.getDocument);
router.get('/:id/document/download', authenticate, requireAdmin, documents.downloadDocument);
router.post('/:id/document', authenticate, requireAdmin, documents.uploadMiddleware, documents.uploadDocument);

router.get('/', contractController.getAll);
router.get('/:id', contractController.getOne);
router.post('/', contractController.createOrUpdate);
router.delete('/:id', contractController.remove);

module.exports = router;

const fs = require('fs/promises');
const multer = require('multer');
const { Contract } = require('../models');
const { sequelize } = require('../models/db');
const { MAX_SIZE, STORAGE, fail, metadataFor, publicMetadata, validateDocument, documentPath } = require('../services/contractDocuments');

const receiveFile = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE, files: 1, fields: 0 } }).single('document');
const uploadMiddleware = (req, res, next) => receiveFile(req, res, err => {
  if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'The document must be 10 MB or smaller.' : 'Please upload one PDF, JPG or PNG document.' });
  next();
});
const respondError = (res, err) => res.status(err.status || 500).json({ message: err.status ? err.message : 'Unable to access the contract document. Please try again.' });
async function getDocument(req, res) {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) throw fail('Contract not found.', 404);
    res.json({ document: publicMetadata(metadataFor(contract)) });
  } catch (err) { respondError(res, err); }
}
async function uploadDocument(req, res) {
  let savedPath;
  try {
    const metadata = validateDocument(req.file);
    await sequelize.transaction(async transaction => {
      const contract = await Contract.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!contract) throw fail('Contract not found.', 404);
      if (metadataFor(contract)) throw fail('This contract already has a document. Reload to view or download it.', 409);
      await fs.mkdir(STORAGE, { recursive: true });
      const target = documentPath(metadata);
      await fs.writeFile(target, req.file.buffer, { flag: 'wx' });
      savedPath = target;
      await contract.update({ document_metadata: { ...metadata, uploadedBy: req.user.id } }, { transaction });
    });
    res.status(201).json({ document: publicMetadata(metadata) });
  } catch (err) {
    if (savedPath) await fs.unlink(savedPath).catch(() => {});
    respondError(res, err);
  }
}
async function downloadDocument(req, res, next) {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) throw fail('Contract not found.', 404);
    const metadata = metadataFor(contract);
    if (!metadata) throw fail('No document has been uploaded for this contract.', 404);
    const filePath = documentPath(metadata);
    try { await fs.access(filePath); } catch (_) { throw fail('The uploaded file is unavailable. Please contact your administrator.', 404); }
    res.set({ 'Content-Type': metadata.mimeType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "sandbox; default-src 'none'" });
    res.download(filePath, metadata.name, err => { if (err) { if (res.headersSent) next(err); else respondError(res, err); } });
  } catch (err) { respondError(res, err); }
}
module.exports = { uploadMiddleware, getDocument, uploadDocument, downloadDocument };

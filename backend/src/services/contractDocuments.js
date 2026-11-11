const path = require('path');
const { randomUUID } = require('crypto');
const MAX_SIZE = 10 * 1024 * 1024;
const STORAGE = path.resolve(__dirname, '../../storage/contract-documents');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const metadataFor = contract => {
  const value = contract.document_metadata;
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
};
const publicMetadata = metadata => metadata ? {
  name: metadata.name, size: metadata.size, mimeType: metadata.mimeType, uploadedAt: metadata.uploadedAt,
} : null;
function validateDocument(file) {
  if (!file?.buffer?.length) throw fail('Please choose a contract document.');
  if (file.buffer.length > MAX_SIZE) throw fail('The document must be 10 MB or smaller.', 413);
  const buffer = file.buffer;
  let type;
  if (buffer.subarray(0, 5).toString() === '%PDF-') type = ['application/pdf', '.pdf'];
  else if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) type = ['image/png', '.png'];
  else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) type = ['image/jpeg', '.jpg'];
  if (!type) throw fail('Only PDF, JPG and PNG documents are supported.');
  const name = String(file.originalname || 'contract').split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  const extension = path.extname(name).toLowerCase();
  const validExtensions = type[0] === 'image/jpeg' ? ['.jpg', '.jpeg'] : [type[1]];
  if (!validExtensions.includes(extension) || file.mimetype !== type[0]) throw fail('The file contents must match its PDF, JPG or PNG file type.');
  return { name, mimeType: type[0], size: buffer.length, key: `${randomUUID()}${type[1]}`, uploadedAt: new Date().toISOString() };
}
function documentPath(metadata) {
  if (!/^[a-f0-9-]{36}\.(pdf|jpg|png)$/.test(metadata?.key || '')) throw fail('The saved document is unavailable.', 404);
  return path.join(STORAGE, metadata.key);
}
module.exports = { MAX_SIZE, STORAGE, fail, metadataFor, publicMetadata, validateDocument, documentPath };

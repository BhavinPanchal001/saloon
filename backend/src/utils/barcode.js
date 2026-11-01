// Keep identifiers as strings so leading zeroes survive round trips.
function normalizeBarcode(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const code = value.trim();
    if (!code) return null;
    if (/^[\x20-\x7E]{1,64}$/.test(code)) return code;
  }
  const error = new Error('Barcode must contain 1–64 printable ASCII characters.');
  error.name = 'BarcodeValidationError';
  throw error;
}
module.exports = { normalizeBarcode };

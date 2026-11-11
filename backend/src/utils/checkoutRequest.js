const { createHash } = require('crypto');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, canonical(value[key])]));
  return value;
}
function checkoutHash(body) {
  const { checkoutKey, sendWhatsApp, printTemplate, paperWidth, ...sale } = body;
  return createHash('sha256').update(JSON.stringify(canonical(sale))).digest('hex');
}
function assertSameCheckout(existing, hash) {
  if (existing.request_hash && existing.request_hash !== hash) {
    const error = new Error(`Checkout ${existing.bill_number} already exists for this request. Open that invoice before starting another sale.`);
    error.status = 409; throw error;
  }
}
module.exports = { checkoutHash, assertSameCheckout };

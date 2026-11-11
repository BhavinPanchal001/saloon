import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabelPrintJob, DEFAULT_LABEL_OPTIONS, encodeBarcode } from '../barcodeLabels.js';
import barcodeValidation from '../../../backend/src/utils/barcode.js';

const product = { id: 1, itemName: 'Shampoo <script>alert(1)</script>', barcode: '001234567890', unitPrice: 25 };
const options = { ...DEFAULT_LABEL_OPTIONS };

test('identifiers retain leading zeroes and reject numeric or control character input', () => {
  assert.equal(barcodeValidation.normalizeBarcode(' 001234 '), '001234');
  assert.equal(barcodeValidation.normalizeBarcode('  '), null);
  for (const code of [1234, '\tA\nB', 'é', 'A'.repeat(65), {}]) {
    assert.throws(() => barcodeValidation.normalizeBarcode(code), /printable ASCII/);
  }
  assert.notEqual(encodeBarcode('001234'), encodeBarcode('1234'));
});

test('print output escapes product content and retains human readable barcode and price', () => {
  const job = buildLabelPrintJob([product], { 1: 2 }, options);
  assert.equal(job.count, 2);
  assert.equal(job.pages, 2);
  assert.ok(job.html.includes('001234567890'));
  assert.ok(job.html.includes('RM 25.00'));
  assert.ok(job.html.includes('&lt;script&gt;'));
  assert.ok(!job.html.includes('<script>'));
  assert.ok(job.css.includes('size: 50mm 30mm'));
});

test('A4 jobs paginate whole labels using available sheet area', () => {
  const job = buildLabelPrintJob([product], { 1: 28 }, { ...options, layout: 'a4' });
  assert.equal(job.pages, 2); // 3 columns x 8 rows = 24 per sheet
  assert.equal((job.html.match(/class="barcode-label"/g) || []).length, 28);
  assert.equal((job.html.match(/class="label-page"/g) || []).length, 2);
});

test('unsafe or unprintable jobs are blocked before opening a print window', () => {
  for (const qty of [-1, 1.5, 501, 'bad']) assert.throws(() => buildLabelPrintJob([product], { 1: qty }, options));
  assert.throws(() => buildLabelPrintJob([product], {}, options), /at least one/);
  assert.throws(() => buildLabelPrintJob([{ ...product, barcode: null }], { 1: 1 }, options), /Assign a barcode/);
  assert.throws(() => buildLabelPrintJob([{ ...product, barcode: 'A'.repeat(64) }], { 1: 1 }, options), /too long/);
  assert.throws(() => buildLabelPrintJob([product], { 1: 1 }, { ...options, layout: 'a4', columns: 8 }), /do not fit/);
  assert.throws(() => buildLabelPrintJob([product], { 1: 1 }, { ...options, width: NaN }), /valid label/);
  assert.throws(() => buildLabelPrintJob([product, { ...product, id: 2 }, { ...product, id: 3 }], { 1: 500, 2: 500, 3: 1 }, options), /1,000/);
});

test('optional text is omitted while barcode stays present', () => {
  const job = buildLabelPrintJob([product], { 1: 1 }, { ...options, showName: false, showPrice: false });
  assert.ok(!job.html.includes('label-name'));
  assert.ok(!job.html.includes('label-price'));
  assert.ok(job.html.includes('001234567890'));
});

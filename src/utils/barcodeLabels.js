import JsBarcode from 'jsbarcode';

export const DEFAULT_LABEL_OPTIONS = {
  layout: 'thermal', width: 50, height: 30, columns: 3,
  margin: 10, gap: 2, showName: true, showPrice: true,
};

export function generateProductBarcode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SAL${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function escapeLabelText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function encodeBarcode(code) {
  if (typeof code !== 'string' || !/^[\x20-\x7E]{1,64}$/.test(code)) {
    throw new Error('Assign a barcode with 1–64 printable ASCII characters before printing.');
  }
  const result = {};
  JsBarcode(result, code, { format: 'CODE128', displayValue: false, margin: 0 });
  return result.encodings.map(encoding => encoding.data).join('');
}

export function buildBarcodeLabel(product, options) {
  const bars = encodeBarcode(product.barcode);
  // Ten modules of quiet space at both edges; refuse excessively dense labels.
  const modules = bars.length + 20;
  const availableWidth = Number(options.width) - 4;
  if (availableWidth / modules < 0.19) {
    throw new Error(`${product.itemName}: barcode is too long for this label width. Increase the width or shorten the code.`);
  }
  const rects = [];
  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === '1') rects.push(`<rect x="${i + 10}" y="0" width="1" height="40"/>`);
  }
  return `<article class="barcode-label">
    ${options.showName ? `<div class="label-name">${escapeLabelText(product.itemName)}</div>` : ''}
    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeLabelText(product.barcode)}" viewBox="0 0 ${modules} 40" preserveAspectRatio="none">${rects.join('')}</svg>
    <div class="label-code">${escapeLabelText(product.barcode)}</div>
    ${options.showPrice ? `<div class="label-price">RM ${Number(product.unitPrice || 0).toFixed(2)}</div>` : ''}
  </article>`;
}

export function buildLabelPrintJob(products, quantities, options) {
  const { layout } = options;
  const width = Number(options.width), height = Number(options.height);
  const columns = Number(options.columns), margin = Number(options.margin), gap = Number(options.gap);
  if (!['thermal', 'a4'].includes(layout) || !Number.isFinite(width) || width < 25 || width > 200 ||
      !Number.isFinite(height) || height < 20 || height > 150 ||
      !Number.isInteger(columns) || columns < 1 || columns > 8 ||
      !Number.isFinite(margin) || margin < 0 || margin > 30 || !Number.isFinite(gap) || gap < 0 || gap > 10) {
    throw new Error('Enter valid label dimensions and page settings.');
  }
  const rows = Math.floor((297 - 2 * margin + gap) / (height + gap));
  if (layout === 'a4' && (width * columns + gap * (columns - 1) > 210 - 2 * margin || rows < 1)) {
    throw new Error('These labels do not fit on A4. Reduce the size, columns, gaps, or margins.');
  }
  const labels = [];
  for (const product of products) {
    const qty = Number(quantities[product.id] ?? 0);
    if (!Number.isInteger(qty) || qty < 0 || qty > 500) throw new Error('Use whole label quantities from 0 to 500 per product.');
    if (labels.length + qty > 1000) throw new Error('Print up to 1,000 labels per job.');
    if (qty) {
      const label = buildBarcodeLabel(product, options);
      for (let index = 0; index < qty; index++) labels.push(label);
    }
  }
  if (!labels.length) throw new Error('Select at least one label to print.');
  const perPage = layout === 'thermal' ? 1 : rows * columns;
  const pages = [];
  for (let index = 0; index < labels.length; index += perPage) {
    pages.push(`<section class="label-page">${labels.slice(index, index + perPage).join('')}</section>`);
  }
  const css = `
    @page { size: ${layout === 'thermal' ? `${width}mm ${height}mm` : 'A4 portrait'}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, sans-serif; }
    .label-page { display: grid; grid-template-columns: repeat(${layout === 'thermal' ? 1 : columns}, ${width}mm);
      grid-auto-rows: ${height}mm; gap: ${layout === 'thermal' ? 0 : gap}mm;
      width: ${layout === 'thermal' ? width : 210}mm; height: ${layout === 'thermal' ? height : 297}mm;
      padding: ${layout === 'thermal' ? 0 : margin}mm; align-content: start; overflow: hidden;
      break-after: page; page-break-after: always; }
    .label-page:last-child { break-after: auto; page-break-after: auto; }
    .barcode-label { width: ${width}mm; height: ${height}mm; padding: 2mm; display: flex;
      flex-direction: column; align-items: center; justify-content: center; gap: .5mm;
      overflow: hidden; background: white; color: black; break-inside: avoid; }
    .label-name { font-size: 9pt; font-weight: bold; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .barcode-label svg { display: block; width: ${width - 4}mm; height: ${Math.max(6, height - 19)}mm; flex-shrink: 0; fill: black; }
    .label-code { font: 8pt monospace; max-width: 100%; overflow: hidden; }
    .label-price { font-size: 9pt; font-weight: bold; }
  `;
  return { count: labels.length, pages: pages.length, html: pages.join(''), css };
}

export function printBarcodeLabels(job) {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Allow pop-ups for this site to open barcode printing.');
  popup.opener = null;
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><title>Barcode labels</title><style>${job.css}
    .print-toolbar { padding: 12px; font: 14px Arial; }
    @media print { .print-toolbar { display: none; } }
    </style></head><body><div class="print-toolbar"><button onclick="window.print()">Print labels</button>
    Print at 100% / Actual size. Disable headers and footers. Select the matching paper size.</div>${job.html}</body></html>`);
  popup.document.close();
  popup.focus();
  // Give the new document a frame to lay out its inline SVGs before printing.
  popup.requestAnimationFrame(() => popup.requestAnimationFrame(() => popup.print()));
}

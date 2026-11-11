// A paginated text/table PDF for cost reports; all amounts use the shared report data.
const escape = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
const currency = (value) => value == null ? 'Unknown' : `RM ${Number(value).toFixed(2)}`;
function generateProfitPDF(data, metadata = {}) {
  const lines = [
    ['PROFIT AND LOSS', true],
    [`Outlet: ${metadata.outletName || 'All outlets'}`],
    [`Period: ${data.startDate || 'All dates'} to ${data.endDate || 'present'}`],
    [`Net sales: ${currency(data.netRevenue)} | Tax collected: ${currency(data.taxCollected)}`],
    [`Cost of goods/materials: ${currency(data.costOfGoodsSold)} | Known costs: ${currency(data.knownCostOfGoodsSold)}`],
    [`Gross profit: ${currency(data.grossProfit)} | Operating expenses: ${currency(data.totalExpenses)}`],
    [`Net profit: ${currency(data.netProfit)} | Margin: ${data.profitMarginPercent == null ? 'Unknown' : `${data.profitMarginPercent}%`}`],
    [`Lines with unknown cost: ${data.unknownCostLines || 0}`],
    ['PRODUCT PROFIT BY BARCODE', true],
  ];
  for (const product of data.productProfits || []) {
    lines.push([`${product.name} | Barcode: ${product.barcode || 'Not recorded'}`, true]);
    lines.push([`Qty: ${product.qtySold} | Net sales: ${currency(product.netRevenue)} | Cost: ${currency(product.costTotal)}`]);
    lines.push([`Gross profit: ${currency(product.grossProfit)} | Margin: ${product.marginPercent == null ? 'Unknown' : `${product.marginPercent}%`}`]);
  }
  lines.push(['OPERATING EXPENSES', true]);
  for (const [category, value] of Object.entries(data.expensesByCategory || {})) lines.push([`${category}: ${currency(value)}`]);
  if (data.unknownCostLines) lines.push(['Profit is unknown where historical or opening stock has no recorded buying cost.']);
  const wrapped = lines.flatMap(([text, bold]) => {
    const chunks = String(text).match(/.{1,95}/g) || [''];
    return chunks.map((part) => [part, bold]);
  });
  const pages = [];
  for (let i = 0; i < wrapped.length; i += 44) pages.push(wrapped.slice(i, i + 44));
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds = pages.map((_, i) => 5 + i * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  pages.forEach((page, index) => {
    const pageId = pageIds[index], contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    const commands = page.map(([text, bold], i) => `BT /${bold ? 'F2' : 'F1'} ${bold ? 10 : 9} Tf 40 ${790 - i * 16} Td (${escape(text)}) Tj ET`);
    commands.push(`BT /F1 8 Tf 40 35 Td (Page ${index + 1} of ${pages.length}) Tj ET`);
    const stream = commands.join('\n');
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 1; i < objects.length; i++) { offsets[i] = Buffer.byteLength(pdf); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
module.exports = { generateProfitPDF };

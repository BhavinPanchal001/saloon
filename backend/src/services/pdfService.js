/**
 * Pure JavaScript PDF Invoice Generator for Glowy Saloon POS Bills.
 * Matches the exact design, layout, typography, colors, and structure of InvoiceModal.jsx.
 */

function sanitizeText(str, maxLength = 0) {
  if (!str) return '';
  let s = String(str);
  if (maxLength > 0 && s.length > maxLength) {
    s = s.substring(0, maxLength);
  }
  // Strip non-printable ASCII characters (PDF Type1 Helvetica requires ASCII 32-126)
  s = s.replace(/[^\x20-\x7E]/g, '');
  // Escape PDF string special characters \ ( )
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const COMPANY_INFO = {
  name: "Glowy",
  tagline: "Glow to go with Glowy",
  address: "42, Brigade Road, 3rd Floor, Bengaluru, Karnataka 560001",
  phone: "+91 80 4567 8900",
  email: "hello@glowy.com",
  gstin: "29AABCG1234F1ZP",
};

function generateInvoicePDFBuffer(bill) {
  const outletName = sanitizeText(bill.outletName || bill.Outlet?.name || 'Outlet 1', 30);
  const billNumber = sanitizeText(bill.billNumber || bill.bill_number || 'GL-2026-OT1-0022', 30);
  const customerName = sanitizeText(bill.customer?.name || bill.customer_name || 'Walk-in Guest', 30);
  const customerPhone = sanitizeText(bill.customer?.phone || bill.customer_phone || '', 20);
  
  const createdDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const dateStr = sanitizeText(createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  const timeStr = sanitizeText(createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());

  const statusRaw = (bill.status || 'paid').toLowerCase();
  const statusLabel = statusRaw === 'paid' ? 'PAID' : statusRaw === 'partially_paid' ? 'PARTIAL' : statusRaw === 'unpaid' ? 'UNPAID' : 'REFUNDED';

  // Currency symbol: ensure ASCII safe (RM or Rs.)
  let curSymbol = sanitizeText(bill.currency || 'RM ');
  if (!curSymbol.trim()) curSymbol = 'RM ';
  if (!curSymbol.endsWith(' ')) curSymbol += ' ';

  const formatCur = (num) => {
    const n = Number(num) || 0;
    return `${curSymbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const subtotalStr = sanitizeText(formatCur(bill.subtotal));
  const discountVal = Number(bill.discountAmount || bill.discount_amount) || 0;
  const discountStr = sanitizeText(formatCur(discountVal));
  const taxStr = sanitizeText(formatCur(bill.tax));
  const totalStr = sanitizeText(formatCur(bill.total));
  const paymentMethod = sanitizeText(bill.paymentMethod || bill.payment_method || 'Unpaid', 20);

  const lineItems = bill.lineItems || bill.line_items || [];

  // PDF Graphics Stream Commands
  const commands = [];

  // --- HEADER SECTION ---
  // Company Brand Name (Navy #1E3A8A)
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 22 Tf 40 780 Td (${sanitizeText(COMPANY_INFO.name)}) Tj ET`);

  // Tagline (Gold #D97706)
  commands.push('0.8 0.6 0.15 rg');
  commands.push(`BT /F1 9 Tf 40 766 Td (${sanitizeText(COMPANY_INFO.tagline)}) Tj ET`);

  // Company Address Details (Right Aligned)
  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 8 Tf 320 785 Td (${sanitizeText(COMPANY_INFO.address)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 350 773 Td (${sanitizeText(COMPANY_INFO.phone)}  .  ${sanitizeText(COMPANY_INFO.email)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 435 761 Td (GSTIN: ${sanitizeText(COMPANY_INFO.gstin)}) Tj ET`);

  // Gold Divider Line
  commands.push('0.85 0.65 0.13 RG 1.5 w');
  commands.push('40 750 m 555 750 l S');

  // --- INVOICE TITLE & META ROW ---
  commands.push('0.1 0.15 0.28 rg');
  commands.push('BT /F2 20 Tf 40 718 Td (INVOICE) Tj ET');

  // Status Badge Box
  if (statusRaw === 'paid') {
    commands.push('0.88 0.96 0.92 rg');
    commands.push('40 695 55 16 re f');
    commands.push('0.09 0.47 0.29 rg');
    commands.push('BT /F2 8 Tf 47 699 Td ([PAID]) Tj ET');
  } else if (statusRaw === 'unpaid') {
    commands.push('0.99 0.91 0.92 rg');
    commands.push('40 695 58 16 re f');
    commands.push('0.88 0.15 0.24 rg');
    commands.push('BT /F2 8 Tf 45 699 Td ([UNPAID]) Tj ET');
  } else {
    commands.push('0.99 0.95 0.88 rg');
    commands.push('40 695 65 16 re f');
    commands.push('0.78 0.42 0.04 rg');
    commands.push(`BT /F2 8 Tf 45 699 Td ([${statusLabel}]) Tj ET`);
  }

  // Invoice Meta Items (Right Aligned Column)
  commands.push('0.45 0.5 0.6 rg');
  commands.push('BT /F1 8 Tf 380 722 Td (INVOICE #) Tj ET');
  commands.push('BT /F1 8 Tf 400 708 Td (DATE) Tj ET');
  commands.push('BT /F1 8 Tf 400 694 Td (TIME) Tj ET');
  commands.push('BT /F1 8 Tf 388 680 Td (OUTLET) Tj ET');

  commands.push('0.1 0.15 0.25 rg');
  commands.push(`BT /F2 9 Tf 450 722 Td (${billNumber}) Tj ET`);
  commands.push(`BT /F1 9 Tf 450 708 Td (${dateStr}) Tj ET`);
  commands.push(`BT /F1 9 Tf 450 694 Td (${timeStr}) Tj ET`);
  commands.push(`BT /F1 9 Tf 450 680 Td (${outletName}) Tj ET`);

  // --- BILL TO BOX ---
  commands.push('0.97 0.98 0.99 rg');
  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push('40 605 515 55 re b');

  commands.push('0.55 0.6 0.7 rg');
  commands.push('BT /F2 8 Tf 55 645 Td (BILL TO) Tj ET');

  commands.push('0.08 0.12 0.2 rg');
  commands.push(`BT /F2 11 Tf 55 628 Td (${customerName}) Tj ET`);

  if (customerPhone) {
    commands.push('0.4 0.45 0.55 rg');
    commands.push(`BT /F1 9 Tf 55 613 Td (${customerPhone}) Tj ET`);
  }

  // --- TABLE HEADER ---
  const tableTopY = 570;
  commands.push('0.85 0.65 0.13 RG 1.5 w');
  commands.push(`40 ${tableTopY} m 555 ${tableTopY} l S`);

  commands.push('0.3 0.35 0.45 rg');
  commands.push(`BT /F2 8 Tf 45 ${tableTopY - 14} Td (#) Tj ET`);
  commands.push(`BT /F2 8 Tf 70 ${tableTopY - 14} Td (ITEM DESCRIPTION) Tj ET`);
  commands.push(`BT /F2 8 Tf 260 ${tableTopY - 14} Td (TYPE) Tj ET`);
  commands.push(`BT /F2 8 Tf 340 ${tableTopY - 14} Td (QTY) Tj ET`);
  commands.push(`BT /F2 8 Tf 410 ${tableTopY - 14} Td (RATE) Tj ET`);
  commands.push(`BT /F2 8 Tf 480 ${tableTopY - 14} Td (AMOUNT) Tj ET`);

  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push(`40 ${tableTopY - 20} m 555 ${tableTopY - 20} l S`);

  // --- TABLE ROWS ---
  let rowY = tableTopY - 38;
  lineItems.slice(0, 12).forEach((item, idx) => {
    const rawName = item.itemName || item.item_name || 'Item';
    const name = sanitizeText(rawName, 32);
    const rawType = item.itemType || item.item_type || 'service';
    const type = sanitizeText(rawType.toUpperCase(), 12);
    const qty = item.qty || 1;
    const priceStr = sanitizeText(formatCur(item.price));
    const amountStr = sanitizeText(formatCur((Number(item.price) || 0) * qty));

    commands.push('0.2 0.25 0.35 rg');
    commands.push(`BT /F1 9 Tf 45 ${rowY} Td (${idx + 1}) Tj ET`);
    commands.push(`BT /F2 9 Tf 70 ${rowY} Td (${name}) Tj ET`);

    // Type Badge
    commands.push('0.5 0.55 0.65 rg');
    commands.push(`BT /F1 8 Tf 260 ${rowY} Td (${type}) Tj ET`);

    commands.push('0.1 0.1 0.1 rg');
    commands.push(`BT /F1 9 Tf 345 ${rowY} Td (${qty}) Tj ET`);
    commands.push(`BT /F1 9 Tf 400 ${rowY} Td (${priceStr}) Tj ET`);
    commands.push(`BT /F2 9 Tf 480 ${rowY} Td (${amountStr}) Tj ET`);

    commands.push('0.93 0.94 0.96 RG 0.5 w');
    commands.push(`40 ${rowY - 8} m 555 ${rowY - 8} l S`);

    rowY -= 26;
  });

  // --- TOTALS SECTION ---
  const totalsY = Math.max(rowY - 15, 340);

  // Subtotal
  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 9 Tf 380 ${totalsY} Td (Subtotal) Tj ET`);
  commands.push('0.1 0.15 0.25 rg');
  commands.push(`BT /F1 9 Tf 470 ${totalsY} Td (${subtotalStr}) Tj ET`);

  let currentTotalsY = totalsY - 18;

  // Discount (if any)
  if (discountVal > 0) {
    commands.push('0.09 0.47 0.29 rg');
    commands.push(`BT /F1 9 Tf 380 ${currentTotalsY} Td (Discount) Tj ET`);
    commands.push(`BT /F1 9 Tf 470 ${currentTotalsY} Td (- ${discountStr}) Tj ET`);
    currentTotalsY -= 18;
  }

  // Tax (8%)
  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 9 Tf 380 ${currentTotalsY} Td (Tax \\(8%\\)) Tj ET`);
  commands.push('0.1 0.15 0.25 rg');
  commands.push(`BT /F1 9 Tf 470 ${currentTotalsY} Td (${taxStr}) Tj ET`);
  currentTotalsY -= 12;

  // Divider Line before Total
  commands.push('0.85 0.65 0.13 RG 1.5 w');
  commands.push(`350 ${currentTotalsY} m 555 ${currentTotalsY} l S`);
  currentTotalsY -= 22;

  // Grand Total Row
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 13 Tf 350 ${currentTotalsY} Td (Total Amount) Tj ET`);
  commands.push(`BT /F2 14 Tf 450 ${currentTotalsY} Td (${totalStr}) Tj ET`);
  currentTotalsY -= 20;

  // Payment Method Row
  commands.push('0.45 0.5 0.6 rg');
  commands.push(`BT /F1 9 Tf 380 ${currentTotalsY} Td (Payment Method: ${paymentMethod}) Tj ET`);

  // --- UPI QR CODE SECTION (Left Aligned opposite Totals) ---
  const upiId = bill.upiId || bill.upi_id || process.env.DEFAULT_UPI_ID || 'glowy@okicici';
  if (upiId) {

    try {
      const QRCode = require('qrcode');
      const payeeName = encodeURIComponent(COMPANY_INFO.name);
      const billNum = encodeURIComponent(bill.billNumber || bill.bill_number || '');
      const amtStr = (Number(bill.total) || 0).toFixed(2);
      const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amtStr}&tr=${billNum}&cu=INR`;
      const qrMatrix = QRCode.create(upiUrl);

      if (qrMatrix && qrMatrix.modules) {
        const size = qrMatrix.modules.size;
        const qrWidth = 80;
        const cellSize = qrWidth / size;
        const qrStartX = 65; // Centered inside 130pt card
        const qrStartY = totalsY - 85;

        // Container Background: Soft Slate/White Card
        commands.push('0.97 0.98 0.99 rg');
        commands.push(`40 ${qrStartY - 25} 130 130 re f`);

        // Accent Gold Top Bar
        commands.push('0.85 0.65 0.13 rg');
        commands.push(`40 ${qrStartY + 103} 130 2 re f`);

        // Header Title (Centered)
        commands.push('0.12 0.23 0.54 rg');
        commands.push(`BT /F2 8 Tf 50 ${qrStartY + 90} Td (SCAN & PAY VIA UPI) Tj ET`);

        // Render Vector QR Code Modules
        commands.push('0 0 0 rg');
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (qrMatrix.modules.get(r, c)) {
              const x = qrStartX + (c * cellSize);
              const y = (qrStartY + 80) - ((r + 1) * cellSize);
              commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${cellSize.toFixed(2)} ${cellSize.toFixed(2)} re f`);
            }
          }
        }

        // UPI ID Text Label (Clean 15pt spacing below QR Code bottom)
        commands.push('0.35 0.4 0.5 rg');
        commands.push(`BT /F2 7.5 Tf 46 ${qrStartY - 15} Td (UPI ID: ${sanitizeText(upiId, 22)}) Tj ET`);


      }
    } catch (qrErr) {
      console.warn('[PDF] QR Code generation notice:', qrErr.message);
    }
  }


  // --- FOOTER SECTION ---
  const footerY = 80;
  commands.push('0.85 0.65 0.13 RG 1 w');
  commands.push(`40 ${footerY + 35} m 555 ${footerY + 35} l S`);

  // Thank You Message (Centered)
  commands.push('0.85 0.6 0.1 rg');
  commands.push(`BT /F2 10 Tf 210 ${footerY + 20} Td (Thank you for choosing Glowy!) Tj ET`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 9 Tf 215 ${footerY + 5} Td (We hope you leave glowing. See you soon!) Tj ET`);

  commands.push('0.6 0.65 0.7 rg');
  commands.push(`BT /F1 7.5 Tf 205 ${footerY - 12} Td (All services are non-refundable once rendered.) Tj ET`);
  commands.push(`BT /F1 7.5 Tf 175 ${footerY - 24} Td (This is a computer-generated invoice and does not require a signature.) Tj ET`);

  const streamContent = commands.join('\n');
  const streamLength = Buffer.byteLength(streamContent);

  // PDF 1.4 Binary Construction
  const pdfParts = [];
  pdfParts.push('%PDF-1.4\n');

  const offsets = [0];

  function addObj(str) {
    offsets.push(pdfParts.reduce((acc, p) => acc + Buffer.byteLength(p), 0));
    pdfParts.push(str);
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  addObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n'
  );
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  addObj(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`);

  const xrefOffset = pdfParts.reduce((acc, p) => acc + Buffer.byteLength(p), 0);
  pdfParts.push(`xref\n0 7\n0000000000 65535 f \n`);
  for (let i = 1; i <= 6; i++) {
    pdfParts.push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }
  pdfParts.push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(pdfParts.join(''));
}

function generateReportPDFBuffer(type, data, metadata = {}) {
  const commands = [];

  const reportTitle = sanitizeText(
    type === 'gst'
      ? 'GST Sales & Tax Register'
      : type === 'shift'
      ? 'Daily Shift End Register'
      : type === 'pnl'
      ? 'Profit & Loss Statement'
      : 'Customer Credit & Dues Report'
  );

  const generatedOn = sanitizeText(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
  const outletInfo = sanitizeText(metadata.outletName || 'All Outlets');
  const dateRangeStr = sanitizeText(
    metadata.startDate && metadata.endDate
      ? `${metadata.startDate} to ${metadata.endDate}`
      : metadata.date
      ? `Date: ${metadata.date}`
      : 'As of Today'
  );

  // --- HEADER ---
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 20 Tf 40 780 Td (${sanitizeText(COMPANY_INFO.name)}) Tj ET`);

  commands.push('0.8 0.6 0.15 rg');
  commands.push(`BT /F1 9 Tf 40 766 Td (${sanitizeText(COMPANY_INFO.tagline)}) Tj ET`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 8 Tf 350 785 Td (${sanitizeText(COMPANY_INFO.address)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 370 773 Td (GSTIN: ${sanitizeText(COMPANY_INFO.gstin)}) Tj ET`);

  commands.push('0.85 0.65 0.13 RG 1.5 w');
  commands.push('40 750 m 555 750 l S');

  // --- REPORT TITLE & META ---
  commands.push('0.1 0.15 0.28 rg');
  commands.push(`BT /F2 16 Tf 40 722 Td (${reportTitle}) Tj ET`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 8.5 Tf 40 706 Td (Outlet: ${outletInfo}   |   Period: ${dateRangeStr}   |   Generated: ${generatedOn}) Tj ET`);

  let currentY = 680;

  // --- SUMMARY KPI BOXES ---
  commands.push('0.96 0.97 0.98 rg');
  commands.push(`40 ${currentY - 45} 515 45 re f`);
  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push(`40 ${currentY - 45} 515 45 re s`);

  if (type === 'gst') {
    const totalBills = data.totalBillsCount || 0;
    const taxable = Number(data.totalTaxableAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const cgst = Number(data.totalCgst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const sgst = Number(data.totalSgst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const totalTax = Number(data.totalTax || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const netRev = Number(data.totalNetRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 7.5 Tf 50 ${currentY - 14} Td (INVOICES: ${totalBills}) Tj ET`);
    commands.push(`BT /F2 7.5 Tf 135 ${currentY - 14} Td (TAXABLE: Rs.${taxable}) Tj ET`);
    commands.push(`BT /F2 7.5 Tf 250 ${currentY - 14} Td (CGST: Rs.${cgst}) Tj ET`);
    commands.push(`BT /F2 7.5 Tf 330 ${currentY - 14} Td (SGST: Rs.${sgst}) Tj ET`);
    commands.push(`BT /F2 7.5 Tf 410 ${currentY - 14} Td (TOTAL GST: Rs.${totalTax}) Tj ET`);

    commands.push('0.12 0.23 0.54 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 33} Td (NET REVENUE (WITH GST): Rs.${netRev}) Tj ET`);

    currentY -= 65;

    // --- TABLE HEADERS ---
    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (BILL #) Tj ET`);
    commands.push(`BT /F2 8 Tf 120 ${currentY - 14} Td (DATE) Tj ET`);
    commands.push(`BT /F2 8 Tf 175 ${currentY - 14} Td (CUSTOMER) Tj ET`);
    commands.push(`BT /F2 8 Tf 265 ${currentY - 14} Td (TAXABLE) Tj ET`);
    commands.push(`BT /F2 8 Tf 330 ${currentY - 14} Td (CGST) Tj ET`);
    commands.push(`BT /F2 8 Tf 385 ${currentY - 14} Td (SGST) Tj ET`);
    commands.push(`BT /F2 8 Tf 440 ${currentY - 14} Td (TOT GST) Tj ET`);
    commands.push(`BT /F2 8 Tf 500 ${currentY - 14} Td (NET TOTAL) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const bills = data.bills || [];
    bills.slice(0, 18).forEach((b) => {
      const bNo = sanitizeText(b.bill_number, 14);
      const bDate = sanitizeText(b.date, 10);
      const cName = sanitizeText(b.customer_name || 'Walk-in', 14);
      const taxVal = Number(b.taxable_amount || 0).toLocaleString('en-IN');
      const cgstVal = Number(b.cgst_amount || 0).toLocaleString('en-IN');
      const sgstVal = Number(b.sgst_amount || 0).toLocaleString('en-IN');
      const totGst = Number(b.total_tax || 0).toLocaleString('en-IN');
      const netVal = Number(b.total_amount || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F1 8 Tf 45 ${rowY} Td (${bNo}) Tj ET`);
      commands.push(`BT /F1 8 Tf 120 ${rowY} Td (${bDate}) Tj ET`);
      commands.push(`BT /F2 8 Tf 175 ${rowY} Td (${cName}) Tj ET`);
      commands.push(`BT /F1 8 Tf 265 ${rowY} Td (Rs.${taxVal}) Tj ET`);
      commands.push(`BT /F1 8 Tf 330 ${rowY} Td (Rs.${cgstVal}) Tj ET`);
      commands.push(`BT /F1 8 Tf 385 ${rowY} Td (Rs.${sgstVal}) Tj ET`);
      commands.push(`BT /F1 8 Tf 440 ${rowY} Td (Rs.${totGst}) Tj ET`);
      commands.push(`BT /F2 8 Tf 500 ${rowY} Td (Rs.${netVal}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);

      rowY -= 22;
    });
  } else if (type === 'shift') {
    const netSales = Number(data.totalNetSales || 0).toLocaleString('en-IN');
    const expenses = Number(data.totalCashExpenses || 0).toLocaleString('en-IN');
    const expected = Number(data.expectedCashInDrawer || 0).toLocaleString('en-IN');

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (TOTAL BILLS: ${data.totalBillsCount || 0}   |   NET SALES: Rs.${netSales}) Tj ET`);
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 34} Td (CASH EXPENSES: Rs.${expenses}   |   EXPECTED CASH IN DRAWER: Rs.${expected}) Tj ET`);

    currentY -= 65;

    commands.push('0.12 0.23 0.54 rg');
    commands.push(`BT /F2 11 Tf 40 ${currentY} Td (Payment Modes Breakdown) Tj ET`);
    currentY -= 20;

    const breakdown = data.paymentBreakdown || {};
    Object.entries(breakdown).forEach(([mode, amt]) => {
      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 9 Tf 50 ${currentY} Td (${sanitizeText(mode)}: Rs.${Number(amt || 0).toLocaleString('en-IN')}) Tj ET`);
      currentY -= 18;
    });
  } else if (type === 'pnl') {
    const netRev = Number(data.netRevenue || 0).toLocaleString('en-IN');
    const exp = Number(data.totalExpenses || 0).toLocaleString('en-IN');
    const netProfit = Number(data.netProfit || 0).toLocaleString('en-IN');
    const margin = data.profitMarginPercent || 0;

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (NET REVENUE: Rs.${netRev}   |   TOTAL EXPENSES: Rs.${exp}) Tj ET`);
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 34} Td (NET PROFIT: Rs.${netProfit} (Margin ${margin}%)) Tj ET`);

    currentY -= 65;

    commands.push('0.12 0.23 0.54 rg');
    commands.push(`BT /F2 11 Tf 40 ${currentY} Td (Expenses Breakdown by Category) Tj ET`);
    currentY -= 20;

    const catExpenses = data.expensesByCategory || {};
    Object.entries(catExpenses).forEach(([cat, amt]) => {
      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 9 Tf 50 ${currentY} Td (${sanitizeText(cat)}: Rs.${Number(amt || 0).toLocaleString('en-IN')}) Tj ET`);
      currentY -= 18;
    });
  } else if (type === 'top-selling') {
    const totalRev = Number(data.totalRevenue || 0).toLocaleString('en-IN');
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (UNIQUE ITEMS: ${data.totalItemsCount || 0}   |   UNITS SOLD: ${data.totalQuantitySold || 0}   |   TOTAL REVENUE: Rs.${totalRev}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (#) Tj ET`);
    commands.push(`BT /F2 8 Tf 70 ${currentY - 14} Td (ITEM DESCRIPTION) Tj ET`);
    commands.push(`BT /F2 8 Tf 260 ${currentY - 14} Td (TYPE) Tj ET`);
    commands.push(`BT /F2 8 Tf 350 ${currentY - 14} Td (UNITS SOLD) Tj ET`);
    commands.push(`BT /F2 8 Tf 450 ${currentY - 14} Td (TOTAL REVENUE) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const items = data.items || [];
    items.slice(0, 18).forEach((item, idx) => {
      const name = sanitizeText(item.name, 25);
      const itemType = sanitizeText(item.type, 12).toUpperCase();
      const rev = Number(item.totalRevenue || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F1 8 Tf 45 ${rowY} Td (${idx + 1}) Tj ET`);
      commands.push(`BT /F2 8 Tf 70 ${rowY} Td (${name}) Tj ET`);
      commands.push(`BT /F1 8 Tf 260 ${rowY} Td (${itemType}) Tj ET`);
      commands.push(`BT /F2 8 Tf 350 ${rowY} Td (${item.qtySold}) Tj ET`);
      commands.push(`BT /F2 8 Tf 450 ${rowY} Td (Rs.${rev}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'stock-summary') {
    const val = Number(data.totalValuation || 0).toLocaleString('en-IN');
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (PRODUCTS: ${data.totalProducts || 0}   |   STOCK UNITS: ${data.totalStockQty || 0}   |   VALUATION: Rs.${val}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (PRODUCT NAME) Tj ET`);
    commands.push(`BT /F2 8 Tf 200 ${currentY - 14} Td (CATEGORY) Tj ET`);
    commands.push(`BT /F2 8 Tf 300 ${currentY - 14} Td (STOCK) Tj ET`);
    commands.push(`BT /F2 8 Tf 380 ${currentY - 14} Td (COST PRICE) Tj ET`);
    commands.push(`BT /F2 8 Tf 470 ${currentY - 14} Td (VALUATION) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const items = data.items || [];
    items.slice(0, 18).forEach((item) => {
      const name = sanitizeText(item.name, 22);
      const cat = sanitizeText(item.category, 14);
      const cost = Number(item.costPrice || 0).toFixed(2);
      const itemVal = Number(item.totalValuation || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${name}) Tj ET`);
      commands.push(`BT /F1 8 Tf 200 ${rowY} Td (${cat}) Tj ET`);
      commands.push(`BT /F2 8 Tf 300 ${rowY} Td (${item.currentStock} ${sanitizeText(item.unit, 6)}) Tj ET`);
      commands.push(`BT /F1 8 Tf 380 ${rowY} Td (Rs.${cost}) Tj ET`);
      commands.push(`BT /F2 8 Tf 470 ${rowY} Td (Rs.${itemVal}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'low-stock') {
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (CRITICAL PRODUCTS BELOW REORDER THRESHOLD: ${data.lowStockCount || 0}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (PRODUCT NAME) Tj ET`);
    commands.push(`BT /F2 8 Tf 220 ${currentY - 14} Td (CATEGORY) Tj ET`);
    commands.push(`BT /F2 8 Tf 330 ${currentY - 14} Td (STOCK) Tj ET`);
    commands.push(`BT /F2 8 Tf 400 ${currentY - 14} Td (MIN ALERT) Tj ET`);
    commands.push(`BT /F2 8 Tf 480 ${currentY - 14} Td (SHORTAGE) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const items = data.items || [];
    items.slice(0, 18).forEach((item) => {
      const name = sanitizeText(item.name, 25);
      const cat = sanitizeText(item.category, 14);

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${name}) Tj ET`);
      commands.push(`BT /F1 8 Tf 220 ${rowY} Td (${cat}) Tj ET`);
      commands.push(`BT /F2 8 Tf 330 ${rowY} Td (${item.currentStock}) Tj ET`);
      commands.push(`BT /F1 8 Tf 400 ${rowY} Td (${item.minStock}) Tj ET`);
      commands.push(`BT /F2 8 Tf 480 ${rowY} Td (+${item.shortage} units) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'purchase-orders') {
    const spend = Number(data.totalSpend || 0).toLocaleString('en-IN');
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (TOTAL ORDERS: ${data.totalOrdersCount || 0}   |   PENDING: ${data.pendingCount || 0}   |   TOTAL SPEND: Rs.${spend}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (PO #) Tj ET`);
    commands.push(`BT /F2 8 Tf 130 ${currentY - 14} Td (DATE) Tj ET`);
    commands.push(`BT /F2 8 Tf 200 ${currentY - 14} Td (VENDOR) Tj ET`);
    commands.push(`BT /F2 8 Tf 350 ${currentY - 14} Td (STATUS) Tj ET`);
    commands.push(`BT /F2 8 Tf 450 ${currentY - 14} Td (AMOUNT) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const orders = data.orders || [];
    orders.slice(0, 18).forEach((o) => {
      const poNum = sanitizeText(o.poNumber, 15);
      const vendor = sanitizeText(o.vendorName, 20);
      const status = sanitizeText(o.status, 12).toUpperCase();
      const amt = Number(o.totalAmount || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${poNum}) Tj ET`);
      commands.push(`BT /F1 8 Tf 130 ${rowY} Td (${sanitizeText(o.date, 10)}) Tj ET`);
      commands.push(`BT /F2 8 Tf 200 ${rowY} Td (${vendor}) Tj ET`);
      commands.push(`BT /F1 8 Tf 350 ${rowY} Td (${status}) Tj ET`);
      commands.push(`BT /F2 8 Tf 450 ${rowY} Td (Rs.${amt}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'attendance' || type === 'employee-attendance') {
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (TOTAL EMPLOYEES: ${data.totalEmployees || 0}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (EMPLOYEE NAME) Tj ET`);
    commands.push(`BT /F2 8 Tf 200 ${currentY - 14} Td (ROLE) Tj ET`);
    commands.push(`BT /F2 8 Tf 310 ${currentY - 14} Td (PRESENT) Tj ET`);
    commands.push(`BT /F2 8 Tf 390 ${currentY - 14} Td (ABSENT) Tj ET`);
    commands.push(`BT /F2 8 Tf 470 ${currentY - 14} Td (LEAVE) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const summary = data.staffSummary || [];
    summary.slice(0, 18).forEach((s) => {
      const name = sanitizeText(s.name, 22);
      const role = sanitizeText(s.role, 14);

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${name}) Tj ET`);
      commands.push(`BT /F1 8 Tf 200 ${rowY} Td (${role}) Tj ET`);
      commands.push(`BT /F2 8 Tf 310 ${rowY} Td (${s.present} days) Tj ET`);
      commands.push(`BT /F1 8 Tf 390 ${rowY} Td (${s.absent} days) Tj ET`);
      commands.push(`BT /F1 8 Tf 470 ${rowY} Td (${s.leave} days) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'payroll' || type === 'employee-payroll') {

    const spend = Number(data.totalPayrollSpend || 0).toLocaleString('en-IN');
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (TOTAL EMPLOYEES: ${data.totalEmployees || 0}   |   NET PAYROLL OUTFLOW: Rs.${spend}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (EMPLOYEE NAME) Tj ET`);
    commands.push(`BT /F2 8 Tf 180 ${currentY - 14} Td (BASE SALARY) Tj ET`);
    commands.push(`BT /F2 8 Tf 280 ${currentY - 14} Td (COMMISSION) Tj ET`);
    commands.push(`BT /F2 8 Tf 380 ${currentY - 14} Td (DEDUCTIONS) Tj ET`);
    commands.push(`BT /F2 8 Tf 470 ${currentY - 14} Td (NET PAYOUT) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const summary = data.payrollSummary || [];
    summary.slice(0, 18).forEach((s) => {
      const name = sanitizeText(s.name, 20);
      const base = Number(s.baseSalary || 0).toLocaleString('en-IN');
      const comm = Number(s.commissionAmount || 0).toLocaleString('en-IN');
      const ded = Number(s.deductions || 0).toLocaleString('en-IN');
      const net = Number(s.netSalary || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${name}) Tj ET`);
      commands.push(`BT /F1 8 Tf 180 ${rowY} Td (Rs.${base}) Tj ET`);
      commands.push(`BT /F1 8 Tf 280 ${rowY} Td (Rs.${comm}) Tj ET`);
      commands.push(`BT /F1 8 Tf 380 ${rowY} Td (Rs.${ded}) Tj ET`);
      commands.push(`BT /F2 8 Tf 470 ${rowY} Td (Rs.${net}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'gstr2') {
    const claimable = Number(data.totalItcClaimable || 0).toLocaleString('en-IN');
    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (PURCHASE ORDERS: ${data.totalPurchaseOrders || 0}   |   TOTAL CLAIMABLE ITC: Rs.${claimable}) Tj ET`);

    currentY -= 65;

    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (PO #) Tj ET`);
    commands.push(`BT /F2 8 Tf 120 ${currentY - 14} Td (DATE) Tj ET`);
    commands.push(`BT /F2 8 Tf 180 ${currentY - 14} Td (VENDOR) Tj ET`);
    commands.push(`BT /F2 8 Tf 300 ${currentY - 14} Td (TAXABLE) Tj ET`);
    commands.push(`BT /F2 8 Tf 380 ${currentY - 14} Td (ITC TAX) Tj ET`);
    commands.push(`BT /F2 8 Tf 460 ${currentY - 14} Td (TOTAL PO) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const purchases = data.purchases || [];
    purchases.slice(0, 18).forEach((p) => {
      const poNum = sanitizeText(p.poNumber, 12);
      const vendor = sanitizeText(p.vendorName, 18);
      const taxVal = Number(p.taxableValue || 0).toLocaleString('en-IN');
      const itc = Number(p.totalTax || 0).toLocaleString('en-IN');
      const tot = Number(p.totalAmount || 0).toLocaleString('en-IN');

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${poNum}) Tj ET`);
      commands.push(`BT /F1 8 Tf 120 ${rowY} Td (${sanitizeText(p.date, 10)}) Tj ET`);
      commands.push(`BT /F2 8 Tf 180 ${rowY} Td (${vendor}) Tj ET`);
      commands.push(`BT /F1 8 Tf 300 ${rowY} Td (Rs.${taxVal}) Tj ET`);
      commands.push(`BT /F2 8 Tf 380 ${rowY} Td (Rs.${itc}) Tj ET`);
      commands.push(`BT /F2 8 Tf 460 ${rowY} Td (Rs.${tot}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);
      rowY -= 22;
    });
  } else if (type === 'credit') {

    const creditAmt = Number(data.totalStoreCredit || 0).toLocaleString('en-IN');
    const dueAmt = Number(data.totalOutstandingDues || 0).toLocaleString('en-IN');

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 18} Td (STORE CREDIT (ADVANCE): Rs.${creditAmt} (${data.customersWithCreditCount || 0} customers)) Tj ET`);
    commands.push(`BT /F2 8.5 Tf 50 ${currentY - 34} Td (OUTSTANDING DUES: Rs.${dueAmt} (${data.customersWithDueCount || 0} customers)) Tj ET`);

    currentY -= 65;

    // --- TABLE HEADERS ---
    commands.push('0.85 0.65 0.13 RG 1.5 w');
    commands.push(`40 ${currentY} m 555 ${currentY} l S`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F2 8 Tf 45 ${currentY - 14} Td (CUSTOMER NAME) Tj ET`);
    commands.push(`BT /F2 8 Tf 200 ${currentY - 14} Td (PHONE) Tj ET`);
    commands.push(`BT /F2 8 Tf 320 ${currentY - 14} Td (STATUS) Tj ET`);
    commands.push(`BT /F2 8 Tf 450 ${currentY - 14} Td (NET BALANCE) Tj ET`);

    commands.push('0.88 0.9 0.94 RG 1 w');
    commands.push(`40 ${currentY - 20} m 555 ${currentY - 20} l S`);

    let rowY = currentY - 35;
    const customers = data.customers || [];
    customers.slice(0, 18).forEach((c) => {
      const cName = sanitizeText(c.name, 22);
      const cPhone = sanitizeText(c.phone, 15);
      const status = sanitizeText(c.status, 15);
      const bal = Number(c.creditBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

      commands.push('0.2 0.25 0.35 rg');
      commands.push(`BT /F2 8 Tf 45 ${rowY} Td (${cName}) Tj ET`);
      commands.push(`BT /F1 8 Tf 200 ${rowY} Td (${cPhone}) Tj ET`);
      commands.push(`BT /F2 8 Tf 320 ${rowY} Td (${status}) Tj ET`);
      commands.push(`BT /F2 8 Tf 450 ${rowY} Td (Rs.${bal}) Tj ET`);

      commands.push('0.93 0.94 0.96 RG 0.5 w');
      commands.push(`40 ${rowY - 6} m 555 ${rowY - 6} l S`);

      rowY -= 22;
    });
  }

  // --- FOOTER ---
  const footerY = 50;
  commands.push('0.85 0.65 0.13 RG 1 w');
  commands.push(`40 ${footerY + 20} m 555 ${footerY + 20} l S`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 8 Tf 180 ${footerY + 5} Td (Generated by Glowy Saloon OS - Confidential Internal Document) Tj ET`);

  const streamContent = commands.join('\n');
  const streamLength = Buffer.byteLength(streamContent);

  const pdfParts = [];
  pdfParts.push('%PDF-1.4\n');

  const offsets = [0];

  function addObj(str) {
    offsets.push(pdfParts.reduce((acc, p) => acc + Buffer.byteLength(p), 0));
    pdfParts.push(str);
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  addObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n'
  );
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  addObj(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`);

  const xrefOffset = pdfParts.reduce((acc, p) => acc + Buffer.byteLength(p), 0);
  pdfParts.push(`xref\n0 7\n0000000000 65535 f \n`);
  for (let i = 1; i <= 6; i++) {
    pdfParts.push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }
  pdfParts.push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(pdfParts.join(''));
}

module.exports = {
  generateInvoicePDFBuffer,
  generateReportPDFBuffer,
};


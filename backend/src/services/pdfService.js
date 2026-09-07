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

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { getRuntimeBusinessInfo } = require('../controllers/businessSettingsController');

const getCompanyInfo = () => {
  const biz = getRuntimeBusinessInfo();
  return {
    name: biz.name || "Glowy",
    tagline: biz.tagline || "Glow to go with Glowy",
    address: biz.address || "Kuala Lumpur, Malaysia",
    phone: biz.phone || "+60 12-345 6789",
    email: biz.email || "hello@glowy.my",
    gstin: biz.taxNumber || "",
    taxNumber: biz.taxNumber || "",
    logoUrl: biz.logoUrl || "",
    showLogoOnReceipt: biz.showLogoOnReceipt !== false,
    receiptFooter: biz.receiptFooter || "THANK YOU FOR VISITING! GLOW TO GO WITH GLOWY",
    terms: biz.terms || "Services and products once rendered/sold are non-refundable. Computer generated invoice.",
  };
};

/**
 * Native PNG / JPEG image decoder for pure JavaScript PDF image embedding (XObject).
 */
function decodePNG(buf) {
  try {
    let offset = 8;
    let width, height, bitDepth, colorType;
    const idats = [];
    while (offset < buf.length) {
      const len = buf.readUInt32BE(offset);
      const type = buf.toString('ascii', offset + 4, offset + 8);
      const data = buf.slice(offset + 8, offset + 8 + len);
      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      } else if (type === 'IDAT') {
        idats.push(data);
      }
      offset += 12 + len;
    }
    if (!idats.length || !width || !height) return null;
    const raw = zlib.inflateSync(Buffer.concat(idats));

    const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
    const stride = width * bpp;
    const uncompressed = Buffer.alloc(width * height * bpp);

    let srcPos = 0;
    let dstPos = 0;
    for (let y = 0; y < height; y++) {
      const filter = raw[srcPos++];
      for (let x = 0; x < stride; x++) {
        const b = raw[srcPos++];
        let left = x >= bpp ? uncompressed[dstPos - bpp] : 0;
        let up = y > 0 ? uncompressed[dstPos - stride] : 0;
        let upLeft = (y > 0 && x >= bpp) ? uncompressed[dstPos - stride - bpp] : 0;
        let val = b;
        if (filter === 1) val = (val + left) & 0xff;
        else if (filter === 2) val = (val + up) & 0xff;
        else if (filter === 3) val = (val + Math.floor((left + up) / 2)) & 0xff;
        else if (filter === 4) {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          let pr = left;
          if (pb < pa && pb <= pc) pr = up;
          else if (pc < pa) pr = upLeft;
          val = (val + pr) & 0xff;
        }
        uncompressed[dstPos++] = val;
      }
    }

    const rgb = Buffer.alloc(width * height * 3);
    let p = 0;
    for (let i = 0; i < width * height; i++) {
      let r, g, b, a = 255;
      if (colorType === 6) {
        r = uncompressed[i * 4];
        g = uncompressed[i * 4 + 1];
        b = uncompressed[i * 4 + 2];
        a = uncompressed[i * 4 + 3];
      } else if (colorType === 2) {
        r = uncompressed[i * 3];
        g = uncompressed[i * 3 + 1];
        b = uncompressed[i * 3 + 2];
      } else {
        r = g = b = uncompressed[i];
      }
      const alpha = a / 255;
      rgb[p++] = Math.round(r * alpha + 255 * (1 - alpha));
      rgb[p++] = Math.round(g * alpha + 255 * (1 - alpha));
      rgb[p++] = Math.round(b * alpha + 255 * (1 - alpha));
    }

    return {
      width,
      height,
      colorSpace: '/DeviceRGB',
      filter: '/FlateDecode',
      data: zlib.deflateSync(rgb),
    };
  } catch (err) {
    console.warn('[PDF] Failed decoding PNG logo:', err.message);
    return null;
  }
}

function decodeJPEG(buf) {
  try {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xFF) break;
      const marker = buf[offset + 1];
      if (marker === 0xD9 || marker === 0xDA) break;
      const len = buf.readUInt16BE(offset + 2);
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        const components = buf[offset + 9];
        return {
          width,
          height,
          colorSpace: components === 1 ? '/DeviceGray' : '/DeviceRGB',
          filter: '/DCTDecode',
          data: buf,
        };
      }
      offset += 2 + len;
    }
  } catch (err) {
    console.warn('[PDF] Failed decoding JPEG logo:', err.message);
  }
  return null;
}

let cachedLogoInfo = null;
function getCachedLogo(logoUrl) {
  if (!logoUrl) return null;
  if (cachedLogoInfo && cachedLogoInfo.url === logoUrl) return cachedLogoInfo;

  try {
    let clean = String(logoUrl).trim();
    clean = clean.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
    const backendDir = path.join(__dirname, '..', '..');
    const absPath = path.join(backendDir, clean);

    if (fs.existsSync(absPath)) {
      const fileBuf = fs.readFileSync(absPath);
      let decoded = null;
      if (clean.toLowerCase().endsWith('.png')) {
        decoded = decodePNG(fileBuf);
      } else if (clean.toLowerCase().endsWith('.jpg') || clean.toLowerCase().endsWith('.jpeg')) {
        decoded = decodeJPEG(fileBuf);
      } else {
        decoded = decodePNG(fileBuf) || decodeJPEG(fileBuf);
      }

      if (decoded) {
        cachedLogoInfo = { url: logoUrl, ...decoded };
        return cachedLogoInfo;
      }
    }
  } catch (err) {
    console.warn('[PDF] Could not load logo image:', err.message);
  }
  return null;
}

function generateInvoicePDFBuffer(bill) {
  const COMPANY_INFO = getCompanyInfo();
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

  const talents = [
    ...new Set(
      [
        bill.servedBy,
        bill.served_by,
        bill.staffName,
        ...lineItems.map((it) => it.staffAssigned || it.staff_assigned),
      ].filter(Boolean)
    ),
  ];
  const servedBy = talents.join(', ');

  if (servedBy) {
    commands.push('0.55 0.6 0.7 rg');
    commands.push('BT /F1 8 Tf 375 666 Td (SERVED BY) Tj ET');
    commands.push('0.1 0.15 0.25 rg');
    commands.push(`BT /F2 8.5 Tf 450 666 Td (${sanitizeText(servedBy, 25)}) Tj ET`);
  }

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
    const talent = item.staffAssigned || item.staff_assigned;

    commands.push('0.2 0.25 0.35 rg');
    commands.push(`BT /F1 9 Tf 45 ${rowY} Td (${idx + 1}) Tj ET`);

    if (talent) {
      commands.push(`BT /F2 9 Tf 70 ${rowY + 3} Td (${name}) Tj ET`);
      commands.push('0.5 0.55 0.65 rg');
      commands.push(`BT /F1 7.5 Tf 70 ${rowY - 7} Td (Served by: ${sanitizeText(talent, 24)}) Tj ET`);
      commands.push('0.2 0.25 0.35 rg');
    } else {
      commands.push(`BT /F2 9 Tf 70 ${rowY} Td (${name}) Tj ET`);
    }

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

/**
 * Pure JavaScript PDF Thermal Receipt Generator for Glowy Saloon POS Bills.
 * Matches the exact thermal receipt format (80mm/58mm roll), monospace typography, and dashed dividers.
 */
function generateThermalInvoicePDFBuffer(bill, options = {}) {
  const COMPANY_INFO = getCompanyInfo();
  const is58mm = Number(options.paperWidth) === 32 || String(options.paperWidth || '').includes('58');
  const pageWidth = is58mm ? 164 : 226; // 58mm (164pt) vs 80mm (226pt)
  const leftX = 10;
  const rightX = pageWidth - 10;
  const contentWidth = rightX - leftX;

  const outletName = sanitizeText(bill.outletName || bill.outlet_name || bill.Outlet?.name || 'Outlet 1');
  const billNumber = sanitizeText(bill.billNumber || bill.bill_number || 'N/A');
  const customerName = sanitizeText(bill.customer?.name || bill.customer_name || 'Walk-in Guest');
  const customerPhone = sanitizeText(bill.customer?.phone || bill.customer_phone || '');

  const createdDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const dateStr = sanitizeText(createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  const timeStr = sanitizeText(createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());

  let curSymbol = sanitizeText(bill.currency || 'RM ');
  if (!curSymbol.trim()) curSymbol = 'RM ';
  if (!curSymbol.endsWith(' ')) curSymbol += ' ';

  const formatCur = (num) => {
    const n = Number(num) || 0;
    return `${curSymbol}${n.toFixed(2)}`;
  };

  const lineItems = bill.lineItems || bill.line_items || [];
  const talents = [
    ...new Set(
      [
        bill.servedBy,
        bill.served_by,
        bill.staffName,
        ...lineItems.map((it) => it.staffAssigned || it.staff_assigned || it.staffName),
      ].filter(Boolean)
    ),
  ];
  const servedBy = talents.join(', ');

  const voucherCode = bill.awardedVoucherCode || bill.awarded_voucher_code || bill.awardedVoucher?.code || (bill.awardedVoucher && bill.awardedVoucher.code);
  const voucherAmt = Number(bill.awardedVoucherAmount || bill.awarded_voucher_amount || bill.awardedVoucher?.amount || (bill.awardedVoucher && bill.awardedVoucher.amount) || 0);

  // Logo setup
  const logoInfo = COMPANY_INFO.showLogoOnReceipt !== false ? getCachedLogo(COMPANY_INFO.logoUrl) : null;
  const showLogo = !!logoInfo;
  const logoDisplayW = is58mm ? 36 : 42;
  const logoDisplayH = logoInfo ? (logoDisplayW * (logoInfo.height / logoInfo.width)) : 0;

  // Split string into wrapped lines respecting word boundaries
  const wrapText = (text, maxChars) => {
    if (!text) return [];
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach((w) => {
      if (!currentLine) {
        currentLine = w;
      } else if ((currentLine + ' ' + w).length <= maxChars) {
        currentLine += ' ' + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Pre-calculate items lines for height
  const itemColChars = is58mm ? 12 : 16;
  let itemsHeight = 0;
  const processedItems = lineItems.map((item, idx) => {
    const rawName = item.itemName || item.item_name || 'Item';
    const nameLines = wrapText(rawName, itemColChars);
    const qty = String(item.qty || 1);
    const price = Number(item.price) || 0;
    const amount = qty * price;
    const talent = item.staffAssigned || item.staff_assigned || item.staffName;

    let unitAbbr = item.productConsumption?.abbr || item.product_consumption?.abbr || '';
    if (!unitAbbr && item.itemType === 'product') {
      unitAbbr = 'PC';
    }

    let h = Math.max(1, nameLines.length) * 9.5;
    if (unitAbbr) h += 8.5;
    if (talent) h += 8.5;
    itemsHeight += h + 3;

    return {
      index: idx + 1,
      nameLines,
      qty,
      price,
      amount,
      unitAbbr,
      talent,
    };
  });

  // Calculate dynamic page height
  let estimatedHeight = 20;
  if (showLogo) estimatedHeight += logoDisplayH + 22;
  estimatedHeight += 70; // Header text
  estimatedHeight += 50; // Metadata
  if (servedBy) estimatedHeight += 10;
  estimatedHeight += 20; // Table header
  estimatedHeight += itemsHeight;
  estimatedHeight += 55; // Subtotals
  estimatedHeight += 30; // Grand total
  estimatedHeight += 25; // Payment info
  if (voucherCode && voucherAmt > 0) estimatedHeight += 84; // Next visit voucher box
  estimatedHeight += 45; // Footer
  estimatedHeight += 25; // Bottom padding

  const pageHeight = Math.ceil(estimatedHeight);
  let currentY = pageHeight - 16;

  const commands = [];
  commands.push('0 0 0 rg 0 0 0 RG');

  const centerText = (str, y, size = 8, bold = false) => {
    const text = sanitizeText(str);
    if (!text) return;
    const font = bold ? '/F2' : '/F1';
    const approxWidth = text.length * size * 0.6;
    const x = Math.max(leftX, (pageWidth - approxWidth) / 2);
    commands.push(`BT ${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${text}) Tj ET`);
  };

  const drawDashed = (y) => {
    commands.push('[2 2] 0 d 0.5 w');
    commands.push(`${leftX} ${y.toFixed(1)} m ${rightX} ${y.toFixed(1)} l S`);
    commands.push('[] 0 d');
  };

  // 1. Logo
  if (showLogo) {
    const logoX = (pageWidth - logoDisplayW) / 2;
    const logoY = currentY - logoDisplayH;
    commands.push(`q ${logoDisplayW.toFixed(1)} 0 0 ${logoDisplayH.toFixed(1)} ${logoX.toFixed(1)} ${logoY.toFixed(1)} cm /Im1 Do Q`);
    currentY = logoY - 22;
  }

  // 2. Business Header
  centerText((COMPANY_INFO.name || 'GLOWY').toUpperCase(), currentY, 13, true);
  currentY -= 12;

  if (COMPANY_INFO.tagline) {
    centerText(COMPANY_INFO.tagline, currentY, 7.5, false);
    currentY -= 9.5;
  }

  if (COMPANY_INFO.address) {
    centerText(COMPANY_INFO.address, currentY, 7, false);
    currentY -= 9;
  }

  if (COMPANY_INFO.phone) {
    centerText(`Ph: ${COMPANY_INFO.phone}`, currentY, 7, false);
    currentY -= 9;
  }

  if (COMPANY_INFO.taxNumber || COMPANY_INFO.gstin) {
    centerText(`SST/Reg: ${COMPANY_INFO.taxNumber || COMPANY_INFO.gstin}`, currentY, 7, false);
    currentY -= 9;
  }

  centerText(`OUTLET: ${outletName.toUpperCase()}`, currentY, 7.5, true);
  currentY -= 11;

  // Divider
  drawDashed(currentY);
  currentY -= 10;

  // 3. Receipt Metadata
  const metaRow = (label, val, boldVal = false) => {
    commands.push(`BT /F1 7.5 Tf ${leftX} ${currentY.toFixed(1)} Td (${sanitizeText(label)}) Tj ET`);
    const valText = sanitizeText(val);
    const font = boldVal ? '/F2' : '/F1';
    const valWidth = valText.length * 7.5 * 0.6;
    const x = Math.max(leftX + 45, rightX - valWidth);
    commands.push(`BT ${font} 7.5 Tf ${x.toFixed(1)} ${currentY.toFixed(1)} Td (${valText}) Tj ET`);
    currentY -= 9.5;
  };

  metaRow('Bill No:', billNumber, true);
  metaRow('Date & Time:', `${dateStr} ${timeStr}`);
  metaRow('Customer:', customerName, true);
  if (customerPhone) metaRow('Phone:', customerPhone);
  if (servedBy) metaRow('Served by:', servedBy, true);

  // Divider
  drawDashed(currentY);
  currentY -= 9.5;

  // 4. Line Items Table
  const colItemX = leftX + 13;
  const colQtyX = rightX - 58;

  // Headers
  commands.push(`BT /F2 7.5 Tf ${leftX} ${currentY.toFixed(1)} Td (#) Tj ET`);
  commands.push(`BT /F2 7.5 Tf ${colItemX} ${currentY.toFixed(1)} Td (ITEM) Tj ET`);
  const qtyHdrWidth = 3 * 7.5 * 0.6;
  commands.push(`BT /F2 7.5 Tf ${(colQtyX - qtyHdrWidth).toFixed(1)} ${currentY.toFixed(1)} Td (QTY) Tj ET`);
  const amtHdrWidth = 6 * 7.5 * 0.6;
  commands.push(`BT /F2 7.5 Tf ${(rightX - amtHdrWidth).toFixed(1)} ${currentY.toFixed(1)} Td (AMOUNT) Tj ET`);
  currentY -= 6;
  drawDashed(currentY);
  currentY -= 9.5;

  // Rows
  processedItems.forEach((item) => {
    const firstLineName = item.nameLines[0] || 'Item';
    const amtStr = sanitizeText(formatCur(item.amount));
    const amtWidth = amtStr.length * 7.5 * 0.6;
    const qtyStr = item.qty;
    const qtyWidth = qtyStr.length * 7.5 * 0.6;

    // First line: Index, First Line Name, Qty, Amount
    commands.push(`BT /F1 7.5 Tf ${leftX} ${currentY.toFixed(1)} Td (${item.index}.) Tj ET`);
    commands.push(`BT /F2 7.5 Tf ${colItemX} ${currentY.toFixed(1)} Td (${sanitizeText(firstLineName)}) Tj ET`);
    commands.push(`BT /F1 7.5 Tf ${(colQtyX - qtyWidth).toFixed(1)} ${currentY.toFixed(1)} Td (${qtyStr}) Tj ET`);
    commands.push(`BT /F2 7.5 Tf ${(rightX - amtWidth).toFixed(1)} ${currentY.toFixed(1)} Td (${amtStr}) Tj ET`);
    currentY -= 9;

    // Remaining name lines (wrapping)
    for (let i = 1; i < item.nameLines.length; i++) {
      commands.push(`BT /F2 7.5 Tf ${colItemX} ${currentY.toFixed(1)} Td (${sanitizeText(item.nameLines[i])}) Tj ET`);
      currentY -= 9;
    }

    // Talent note
    if (item.talent) {
      commands.push(`BT /F1 6.5 Tf ${colItemX} ${currentY.toFixed(1)} Td (Served by: ${sanitizeText(item.talent)}) Tj ET`);
      currentY -= 8;
    }

    // Unit rate
    if (item.unitAbbr) {
      commands.push(`BT /F1 6.5 Tf ${colItemX} ${currentY.toFixed(1)} Td (@ ${formatCur(item.price)}/${item.unitAbbr}) Tj ET`);
      currentY -= 8;
    }

    currentY -= 1.5;
  });

  // Divider
  drawDashed(currentY);
  currentY -= 9.5;

  // 5. Totals
  const totalRow = (label, val, boldLabel = false, boldVal = false) => {
    const fontL = boldLabel ? '/F2' : '/F1';
    const fontV = boldVal ? '/F2' : '/F1';
    commands.push(`BT ${fontL} 7.5 Tf ${leftX} ${currentY.toFixed(1)} Td (${sanitizeText(label)}) Tj ET`);
    const valText = sanitizeText(val);
    const valWidth = valText.length * 7.5 * 0.6;
    const x = rightX - valWidth;
    commands.push(`BT ${fontV} 7.5 Tf ${x.toFixed(1)} ${currentY.toFixed(1)} Td (${valText}) Tj ET`);
    currentY -= 9.5;
  };

  totalRow('Subtotal:', formatCur(bill.subtotal));

  const discountVal = Number(bill.discountAmount || bill.discount_amount) || 0;
  if (discountVal > 0) {
    const coupon = bill.couponCode || bill.coupon_code ? ` (${bill.couponCode || bill.coupon_code})` : '';
    totalRow(`Discount${coupon}:`, `- ${formatCur(discountVal)}`);
  }

  const voucherDisc = Number(bill.voucherDiscountAmount || bill.voucher_discount_amount) || 0;
  if (voucherDisc > 0) {
    const vCode = bill.voucherCode || bill.voucher_code ? ` (${bill.voucherCode || bill.voucher_code})` : '';
    totalRow(`Voucher${vCode}:`, `- ${formatCur(voucherDisc)}`);
  }

  const ptsRedeemed = Number(bill.pointsRedeemed || bill.points_redeemed) || 0;
  const ptsDisc = Number(bill.pointsDiscountAmount || bill.points_discount_amount) || 0;
  if (ptsRedeemed > 0) {
    totalRow(`Points Redeemed (${ptsRedeemed}):`, `- ${formatCur(ptsDisc)}`);
  }

  const taxVal = Number(bill.tax) || 0;
  if (taxVal > 0) {
    totalRow('Tax (GST 8%):', formatCur(taxVal));
  }

  // 6. Double Line Grand Total
  currentY -= 2;
  commands.push('0 0 0 RG 1 w');
  commands.push(`${leftX} ${currentY.toFixed(1)} m ${rightX} ${currentY.toFixed(1)} l S`);
  currentY -= 11.5;

  commands.push(`BT /F2 10.5 Tf ${leftX} ${currentY.toFixed(1)} Td (TOTAL:) Tj ET`);
  const grandTotalStr = formatCur(bill.total);
  const grandTotalWidth = grandTotalStr.length * 11 * 0.6;
  commands.push(`BT /F2 11 Tf ${(rightX - grandTotalWidth).toFixed(1)} ${currentY.toFixed(1)} Td (${grandTotalStr}) Tj ET`);
  currentY -= 4.5;

  commands.push('0 0 0 RG 1 w');
  commands.push(`${leftX} ${currentY.toFixed(1)} m ${rightX} ${currentY.toFixed(1)} l S`);
  currentY -= 10;

  // 7. Payment Info
  const paymentMethod = sanitizeText((bill.paymentMethod || bill.payment_method || 'UNPAID').toUpperCase(), 20);
  metaRow('Payment Method:', paymentMethod, true);

  if (bill.payments && bill.payments.length > 0) {
    bill.payments.forEach((p) => {
      (p.details || []).forEach((d) => {
        const mode = (d.paymentMode || d.payment_mode || 'Cash').toUpperCase();
        commands.push(`BT /F1 7 Tf ${leftX + 8} ${currentY.toFixed(1)} Td (${sanitizeText(mode)}:) Tj ET`);
        const amtStr = formatCur(d.amount);
        const w = amtStr.length * 7 * 0.6;
        commands.push(`BT /F1 7 Tf ${(rightX - w).toFixed(1)} ${currentY.toFixed(1)} Td (${amtStr}) Tj ET`);
        currentY -= 8.5;
      });
    });
  }

  const pointsEarned = Number(bill.pointsEarned || bill.points_earned) || 0;
  if (pointsEarned > 0) {
    commands.push(`BT /F2 7.5 Tf ${leftX} ${currentY.toFixed(1)} Td (Points Earned Today:) Tj ET`);
    const ptsStr = `+${pointsEarned} pts`;
    const w = ptsStr.length * 7.5 * 0.6;
    commands.push(`BT /F2 7.5 Tf ${(rightX - w).toFixed(1)} ${currentY.toFixed(1)} Td (${ptsStr}) Tj ET`);
    currentY -= 9.5;
  }

  // 8. Next Visit Voucher Box (matching preview)
  if (voucherCode && voucherAmt > 0) {
    currentY -= 2;
    drawDashed(currentY);
    currentY -= 8;

    const boxX = leftX + 2;
    const boxW = contentWidth - 4;
    const boxH = 76;
    const boxBottomY = currentY - boxH;

    // Draw box border
    commands.push('0 0 0 RG 0.8 w');
    commands.push(`${boxX.toFixed(1)} ${boxBottomY.toFixed(1)} ${boxW.toFixed(1)} ${boxH.toFixed(1)} re s`);

    centerText('* * * NEXT VISIT VOUCHER * * *', currentY - 11, 8, true);
    centerText('Special Gift for Your Next Visit!', currentY - 21, 6.5, false);

    // Inner discount badge
    const badgeText = `${formatCur(voucherAmt)} OFF`;
    const badgeTextW = badgeText.length * 8.5 * 0.6;
    const badgeW = badgeTextW + 16;
    const badgeH = 13;
    const badgeX = (pageWidth - badgeW) / 2;
    const badgeY = currentY - 41;

    commands.push('0 0 0 RG 0.8 w');
    commands.push(`${badgeX.toFixed(1)} ${badgeY.toFixed(1)} ${badgeW.toFixed(1)} ${badgeH.toFixed(1)} re s`);
    centerText(badgeText, currentY - 37.5, 8.5, true);

    centerText(`CODE: ${voucherCode}`, currentY - 51, 8, true);
    centerText('Present receipt or code on your next visit', currentY - 61, 5.5, false);
    centerText('to redeem discount.', currentY - 68, 5.5, false);

    currentY = boxBottomY - 6;
  }

  // 9. Footer
  drawDashed(currentY);
  currentY -= 11;

  centerText('THANK YOU FOR VISITING! GLOW TO GO WITH GLOWY', currentY, 7.5, true);
  currentY -= 9;

  centerText('Services and products once rendered/sold are non-refundable.', currentY, 6, false);
  currentY -= 8;
  centerText('Computer generated invoice.', currentY, 6, false);

  const streamContent = commands.join('\n');
  const streamBuf = Buffer.from(streamContent);

  // PDF Binary Structure
  const pdfParts = [];
  pdfParts.push(Buffer.from('%PDF-1.4\n'));
  const offsets = [0];
  function addPart(b) {
    offsets.push(pdfParts.reduce((acc, p) => acc + p.length, 0));
    pdfParts.push(b);
  }

  addPart(Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  addPart(Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'));

  const xObjRes = showLogo ? ' /XObject << /Im1 7 0 R >>' : '';
  addPart(Buffer.from(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObjRes} >> /Contents 6 0 R >>\nendobj\n`));
  addPart(Buffer.from('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'));
  addPart(Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n'));
  addPart(Buffer.from(`6 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`));

  if (showLogo) {
    const imgHeader = Buffer.from(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoInfo.width} /Height ${logoInfo.height} /ColorSpace ${logoInfo.colorSpace} /BitsPerComponent 8 /Filter ${logoInfo.filter} /Length ${logoInfo.data.length} >>\nstream\n`);
    const imgFooter = Buffer.from('\nendstream\nendobj\n');
    addPart(Buffer.concat([imgHeader, logoInfo.data, imgFooter]));
  }

  const objCount = showLogo ? 8 : 7;
  const xrefOffset = pdfParts.reduce((acc, p) => acc + p.length, 0);
  let xref = `xref\n0 ${objCount}\n0000000000 65535 f \n`;
  for (let i = 1; i < objCount; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdfParts.push(Buffer.from(xref));
  pdfParts.push(Buffer.from(`trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));

  return Buffer.concat(pdfParts);
}

function generateReportPDFBuffer(type, data, metadata = {}) {
  const COMPANY_INFO = getCompanyInfo();
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

/**
 * Generate End of Shift Z-Report PDF Buffer
 * @param {Object} reportData - Output of computeShiftMetrics
 * @returns {Buffer} PDF binary buffer
 */
function generateZReportPDFBuffer(reportData) {
  const COMPANY_INFO = getCompanyInfo();
  const shift = reportData?.shift || {};
  const terminal = shift.terminal || {};
  const user = shift.user || {};
  const outlet = shift.outlet || {};

  const outletName = sanitizeText(outlet.name || COMPANY_INFO.name || 'Glowy Saloon', 35);
  const shiftId = shift.id || 'N/A';
  const terminalName = sanitizeText(terminal.name || terminal.code || 'Counter 1', 25);
  const cashierName = sanitizeText(user.name || 'Staff Member', 30);

  const openedDate = shift.opened_at ? new Date(shift.opened_at) : new Date();
  const closedDate = shift.closed_at ? new Date(shift.closed_at) : new Date();
  const openedStr = sanitizeText(openedDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
  const closedStr = sanitizeText(closedDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
  const generatedStr = sanitizeText(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));

  const cur = sanitizeText(COMPANY_INFO.currency || 'RM');
  const fmt = (val) => `${cur} ${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const billsCount = Number(reportData.billsCount) || 0;
  const grossSales = fmt(reportData.totalSales);
  const cashSales = fmt(reportData.cashSales);
  const cardSales = fmt(reportData.cardSales);
  const upiSales = fmt(reportData.upiSales);
  const creditOtherSales = fmt((Number(reportData.creditSales) || 0) + (Number(reportData.otherSales) || 0));
  const totalDiscounts = fmt(reportData.totalDiscount);
  const totalTax = fmt(reportData.totalTax);

  const openingFloat = fmt(reportData.openingCash);
  const cashSalesPlus = `+${fmt(reportData.cashSales)}`;
  const cashIn = `+${fmt(reportData.totalCashIn)}`;
  const cashOut = `-${fmt(reportData.totalCashOut)}`;
  const expectedCash = fmt(reportData.expectedCash);
  const actualCash = fmt(shift.actual_closing_cash || 0);
  const varianceNum = Number(shift.variance) || 0;
  const varianceStr = fmt(varianceNum);

  const commands = [];

  // --- BRAND HEADER ---
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 22 Tf 40 782 Td (${sanitizeText(COMPANY_INFO.name)}) Tj ET`);

  commands.push('0.8 0.6 0.15 rg');
  commands.push(`BT /F1 9 Tf 40 768 Td (${sanitizeText(COMPANY_INFO.tagline)}) Tj ET`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F1 8 Tf 340 785 Td (${sanitizeText(COMPANY_INFO.address)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 370 773 Td (${sanitizeText(COMPANY_INFO.phone)}  .  ${sanitizeText(COMPANY_INFO.email)}) Tj ET`);
  if (COMPANY_INFO.gstin) {
    commands.push(`BT /F1 8 Tf 435 761 Td (Tax/SST: ${sanitizeText(COMPANY_INFO.gstin)}) Tj ET`);
  }

  // Gold accent divider
  commands.push('0.85 0.65 0.13 RG 1.5 w');
  commands.push('40 750 m 555 750 l S');

  // --- REPORT TITLE & BADGE ---
  commands.push('0.1 0.15 0.28 rg');
  commands.push('BT /F2 17 Tf 40 720 Td (END OF SHIFT Z-REPORT) Tj ET');

  // Shift Closed Badge
  commands.push('0.88 0.96 0.92 rg');
  commands.push('445 714 110 20 re f');
  commands.push('0.1 0.5 0.3 RG 1 w');
  commands.push('445 714 110 20 re s');
  commands.push('0.08 0.45 0.25 rg');
  commands.push('BT /F2 8.5 Tf 455 720 Td (STATUS: SHIFT CLOSED) Tj ET');

  commands.push('0.45 0.5 0.6 rg');
  commands.push(`BT /F1 9 Tf 40 705 Td (Official Terminal Cash Reconciliation & Sales Audit Slip  .  Generated ${generatedStr}) Tj ET`);

  // --- METADATA CARD ---
  commands.push('0.96 0.97 0.99 rg');
  commands.push('40 640 515 52 re f');
  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push('40 640 515 52 re s');

  commands.push('0.2 0.25 0.35 rg');
  commands.push(`BT /F2 8.5 Tf 52 675 Td (OUTLET:) Tj ET`);
  commands.push(`BT /F1 8.5 Tf 95 675 Td (${outletName}) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 220 675 Td (SHIFT #:) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 265 675 Td (#${shiftId}) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 380 675 Td (TERMINAL:) Tj ET`);
  commands.push(`BT /F1 8.5 Tf 435 675 Td (${terminalName}) Tj ET`);

  commands.push(`BT /F2 8.5 Tf 52 650 Td (CASHIER:) Tj ET`);
  commands.push(`BT /F1 8.5 Tf 95 650 Td (${cashierName}) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 220 650 Td (OPENED:) Tj ET`);
  commands.push(`BT /F1 8 Tf 265 650 Td (${openedStr}) Tj ET`);
  commands.push(`BT /F2 8.5 Tf 380 650 Td (CLOSED:) Tj ET`);
  commands.push(`BT /F1 8 Tf 435 650 Td (${closedStr}) Tj ET`);

  let currentY = 615;

  // --- SECTION 1: SALES SUMMARY ---
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 11 Tf 40 ${currentY} Td (1. SALES PERFORMANCE SUMMARY) Tj ET`);
  currentY -= 12;

  commands.push('0.96 0.97 0.99 rg');
  commands.push(`40 ${currentY - 142} 515 142 re f`);
  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push(`40 ${currentY - 142} 515 142 re s`);

  const salesRows = [
    { label: 'Total Completed Bills', val: `${billsCount}`, bold: false },
    { label: 'GROSS SALES TOTAL', val: grossSales, bold: true, highlight: true },
    { label: 'Cash Sales Collected', val: cashSales, bold: false },
    { label: 'Card / Debit / Credit Sales', val: cardSales, bold: false },
    { label: 'UPI / QR / Online Sales', val: upiSales, bold: false },
    { label: 'Store Credit / Other Sales', val: creditOtherSales, bold: false },
    { label: 'Total Discounts Given', val: totalDiscounts, bold: false },
    { label: 'Total Taxes / GST Applicable', val: totalTax, bold: false },
  ];

  let sRowY = currentY - 16;
  salesRows.forEach((r, idx) => {
    if (r.highlight) {
      commands.push('0.92 0.95 0.99 rg');
      commands.push(`41 ${sRowY - 4} 513 16 re f`);
      commands.push('0.12 0.23 0.54 rg');
      commands.push(`BT /F2 8.5 Tf 52 ${sRowY} Td (${r.label}) Tj ET`);
      commands.push(`BT /F2 9 Tf 460 ${sRowY} Td (${r.val}) Tj ET`);
    } else {
      commands.push('0.25 0.3 0.4 rg');
      commands.push(`BT /F1 8.5 Tf 52 ${sRowY} Td (${r.label}) Tj ET`);
      commands.push(`BT /F1 8.5 Tf 460 ${sRowY} Td (${r.val}) Tj ET`);
    }

    if (idx < salesRows.length - 1) {
      commands.push('0.9 0.92 0.95 RG 0.5 w');
      commands.push(`45 ${sRowY - 5} m 550 ${sRowY - 5} l S`);
    }
    sRowY -= 17;
  });

  currentY -= 168;

  // --- SECTION 2: DRAWER RECONCILIATION ---
  commands.push('0.12 0.23 0.54 rg');
  commands.push(`BT /F2 11 Tf 40 ${currentY} Td (2. DRAWER CASH RECONCILIATION) Tj ET`);
  currentY -= 12;

  commands.push('0.96 0.97 0.99 rg');
  commands.push(`40 ${currentY - 148} 515 148 re f`);
  commands.push('0.88 0.9 0.94 RG 1 w');
  commands.push(`40 ${currentY - 148} 515 148 re s`);

  const drawerRows = [
    { label: 'Opening Cash Float', val: openingFloat, color: '0.3 0.35 0.45 rg', font: '/F1' },
    { label: 'Cash Sales (Drawer Addition)', val: cashSalesPlus, color: '0.08 0.5 0.25 rg', font: '/F2' },
    { label: 'Manual Cash In (Petty/Change Addition)', val: cashIn, color: '0.08 0.5 0.25 rg', font: '/F2' },
    { label: 'Manual Cash Out (Vendor/Expense Paid)', val: cashOut, color: '0.8 0.45 0.1 rg', font: '/F2' },
    { label: 'EXPECTED CASH IN DRAWER', val: expectedCash, color: '0.1 0.15 0.28 rg', font: '/F2', bg: true },
    { label: 'ACTUAL PHYSICAL CASH COUNTED', val: actualCash, color: '0.12 0.23 0.54 rg', font: '/F2', bg: true },
    {
      label: 'VARIANCE (OVER / SHORT)',
      val: `${varianceStr} ${varianceNum === 0 ? '(Balanced)' : varianceNum > 0 ? '(Over)' : '(Short)'}`,
      color: varianceNum < 0 ? '0.8 0.15 0.15 rg' : '0.08 0.5 0.25 rg',
      font: '/F2',
      bg: true,
    },
  ];

  let dRowY = currentY - 16;
  drawerRows.forEach((r, idx) => {
    if (r.bg) {
      commands.push(idx === 6 ? (varianceNum < 0 ? '0.99 0.94 0.94 rg' : '0.92 0.98 0.94 rg') : '0.92 0.94 0.97 rg');
      commands.push(`41 ${dRowY - 4} 513 17 re f`);
    }

    commands.push(r.color);
    commands.push(`BT ${r.font} 8.5 Tf 52 ${dRowY} Td (${r.label}) Tj ET`);
    commands.push(`BT ${r.font} 9 Tf 430 ${dRowY} Td (${r.val}) Tj ET`);

    if (idx < drawerRows.length - 1) {
      commands.push('0.9 0.92 0.95 RG 0.5 w');
      commands.push(`45 ${dRowY - 5} m 550 ${dRowY - 5} l S`);
    }
    dRowY -= 19;
  });

  currentY -= 175;

  // --- CLOSING NOTES (IF ANY) ---
  if (shift.closing_notes) {
    const notesStr = sanitizeText(shift.closing_notes, 90);
    commands.push('0.12 0.23 0.54 rg');
    commands.push(`BT /F2 9.5 Tf 40 ${currentY} Td (3. CASHIER / CLOSING NOTES) Tj ET`);
    currentY -= 10;

    commands.push('0.98 0.98 0.99 rg');
    commands.push(`40 ${currentY - 24} 515 24 re f`);
    commands.push('0.88 0.9 0.94 RG 0.8 w');
    commands.push(`40 ${currentY - 24} 515 24 re s`);

    commands.push('0.3 0.35 0.45 rg');
    commands.push(`BT /F1 8 Tf 50 ${currentY - 15} Td (Note: ${notesStr}) Tj ET`);
    currentY -= 35;
  }

  // --- FOOTER ---
  const footerY = 45;
  commands.push('0.85 0.65 0.13 RG 1 w');
  commands.push(`40 ${footerY + 22} m 555 ${footerY + 22} l S`);

  commands.push('0.4 0.45 0.55 rg');
  commands.push(`BT /F2 8 Tf 220 ${footerY + 10} Td (*** END OF SHIFT REPORT ***) Tj ET`);
  commands.push(`BT /F1 7.5 Tf 145 ${footerY - 2} Td (Generated by Glowy Saloon OS  .  Confidential Management Document  .  Page 1 of 1) Tj ET`);

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
  generateThermalInvoicePDFBuffer,
  generateReportPDFBuffer,
  generateZReportPDFBuffer,
};



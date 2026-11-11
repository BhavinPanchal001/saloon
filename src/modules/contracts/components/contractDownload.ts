const escape = (value: any) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

// Template masters contain rich text. Keep formatting only; exclude scripts,
// event handlers, styles, frames, remote resources and active links.
export function safeTemplate(content: string) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const allowed = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'H4', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'BLOCKQUOTE', 'SPAN', 'DIV']);
  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as Element;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'].includes(element.tagName)) return '';
    const children = Array.from(node.childNodes).map(render).join('');
    return allowed.has(element.tagName) ? `<${element.tagName.toLowerCase()}>${children}</${element.tagName.toLowerCase()}>` : children;
  };
  return Array.from(parsed.body.childNodes).map(render).join('');
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadContract(contract: any) {
  const facts = (pairs: any[][]) => `<dl>${pairs.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value === '' || value == null ? 'Not configured' : value)}</dd>`).join('')}</dl>`;
  const list = (items: any[], describe: (item: any) => string) => items.length ? `<ul>${items.map(item => `<li>${escape(describe(item))}</li>`).join('')}</ul>` : '<p>None configured.</p>';
  const content = `<h1>${escape(contract.title || 'Employment Contract')}</h1>${facts([
    ['Contract Code', contract.code], ['Employee', contract.employeeName], ['Version', contract.currentVersion], ['Contract Type', contract.typeName], ['Contract Group', contract.groupName],
    ['Start Date', contract.startDate], ['End Date', contract.endDate || 'Ongoing'], ['Status', contract.effectiveStatus || contract.status],
    ['Probation (months)', contract.probationPeriodMonths], ['Notice (days)', contract.noticePeriodDays],
  ])}${contract.templateContent ? `<h2>${escape(contract.templateName || 'Agreement Terms')}</h2>${safeTemplate(contract.templateContent)}` : ''}
  <h2>Work Schedule</h2>${facts([['Shift', contract.shiftName], ['Shift Hours', contract.shiftStartTime && contract.shiftEndTime ? `${contract.shiftStartTime} - ${contract.shiftEndTime}` : ''], ['Work Week', contract.workWeekName], ['Working Days', (contract.operationalDays || []).join(', ')], ['Weekly Off', (contract.weeklyOffPattern || []).join(', ')]])}
  <h2>Leave Types</h2>${list(contract.leaveAllocations || [], item => `${item.name}: ${item.count} days/year (${item.isPaid ? 'Paid' : 'Unpaid'})`)}
  <h2>Holidays</h2>${list(contract.holidays || [], item => `${item.name}: ${item.startDate}${item.endDate && item.endDate !== item.startDate ? ` to ${item.endDate}` : ''}`)}
  <h2>Overtime</h2>${facts([['Overtime Allowed', contract.overtime?.enabled ? 'Yes' : 'No'], ...(contract.overtime?.enabled ? [['Overtime Type', contract.overtime.type], ['Overtime Calculation', contract.overtime.rateCalculation], ['Overtime Rate', contract.overtime.rateValue]] : []), ['Notes', contract.notes]])}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(contract.code)} Contract</title><style>body{font:15px/1.6 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#172b45}h1,h2{color:#163e69}h2{margin-top:32px;border-bottom:1px solid #ddd}dl{display:grid;grid-template-columns:1fr 2fr;gap:8px 24px}dt{color:#52657d}dd{margin:0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}@media print{body{margin:0;max-width:none}h2{break-after:avoid}}</style></head><body>${content}</body></html>`;
  saveBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${String(contract.code || 'contract').replace(/[^a-z0-9_-]/gi, '_')}.html`);
}

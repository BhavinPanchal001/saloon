import { useMemo, useState } from 'react';
import { Barcode, Printer, X } from 'lucide-react';
import { buildLabelPrintJob, DEFAULT_LABEL_OPTIONS, printBarcodeLabels } from '../../../utils/barcodeLabels';

export function BarcodePrintModal({ products, onClose }) {
  const [options, setOptions] = useState(DEFAULT_LABEL_OPTIONS);
  const [quantities, setQuantities] = useState(() => Object.fromEntries(products.map(product => [
    product.id, products.length === 1 && product.barcode ? 1 : 0,
  ])));
  const [search, setSearch] = useState('');
  const [printError, setPrintError] = useState('');
  const visibleProducts = products.filter(product => `${product.itemName} ${product.barcode || ''}`.toLowerCase().includes(search.toLowerCase()));
  const { job, error } = useMemo(() => {
    try { return { job: buildLabelPrintJob(products, quantities, options), error: '' }; }
    catch (err) { return { job: null, error: err.message }; }
  }, [products, quantities, options]);
  const change = (key, value) => { setOptions(current => ({ ...current, [key]: value })); setPrintError(''); };
  const numberField = (key, label, min, max, step = 1) => (
    <label className="block text-sm text-slate-600">{label}
      <input className="premium-input mt-1" type="number" min={min} max={max} step={step} value={options[key]}
        onChange={event => change(key, event.target.value)} />
    </label>
  );
  const print = () => {
    try { printBarcodeLabels(job); setPrintError(''); }
    catch (err) { setPrintError(err.message); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="barcode-print-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 id="barcode-print-title" className="flex items-center gap-2 text-xl font-bold text-navy-900"><Barcode size={22} /> Print barcode labels</h2>
            <p className="mt-1 text-sm text-slate-500">Code 128 · Select products and label quantities.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close barcode printing" className="rounded-lg p-2 hover:bg-slate-100"><X size={22} /></button>
        </header>
        <div className="grid flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input aria-label="Search products for labels" className="premium-input" placeholder="Search product or barcode" value={search} onChange={event => setSearch(event.target.value)} />
              <button type="button" className="btn-premium-outline whitespace-nowrap" onClick={() => setQuantities(current => ({ ...current, ...Object.fromEntries(visibleProducts.filter(product => product.barcode).map(product => [product.id, 1])) }))}>Select visible</button>
              <button type="button" className="btn-premium-outline" onClick={() => setQuantities({})}>Clear</button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left"><tr><th className="p-3">Product / barcode</th><th className="w-28 p-3">Labels</th></tr></thead>
                <tbody>{visibleProducts.map(product => (
                  <tr key={product.id} className="border-t">
                    <td className="p-3"><div className="font-medium">{product.itemName}</div><div className="font-mono text-xs text-slate-500">{product.barcode || 'Set a barcode in Edit Product first'}</div></td>
                    <td className="p-3"><input type="number" min="0" max="500" step="1" className="premium-input" disabled={!product.barcode}
                      aria-label={`Label quantity for ${product.itemName}`} value={quantities[product.id] ?? 0}
                      onChange={event => setQuantities(current => ({ ...current, [product.id]: event.target.value }))} /></td>
                  </tr>
                ))}</tbody>
              </table>
              {!visibleProducts.length && <p className="p-4 text-sm text-slate-500">No matching products.</p>}
            </div>
            <label className="block text-sm text-slate-600">Paper layout
              <select className="premium-input mt-1" value={options.layout} onChange={event => change('layout', event.target.value)}>
                <option value="thermal">Thermal label roll</option><option value="a4">A4 sticker sheet</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {numberField('width', 'Label width (mm)', 25, 200, 0.1)}
              {numberField('height', 'Label height (mm)', 20, 150, 0.1)}
              {options.layout === 'a4' && <>
                {numberField('columns', 'Columns', 1, 8)}
                {numberField('margin', 'Sheet margin (mm)', 0, 30, 0.1)}
                {numberField('gap', 'Label gap (mm)', 0, 10, 0.1)}
              </>}
            </div>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.showName} onChange={event => change('showName', event.target.checked)} />Product name</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.showPrice} onChange={event => change('showPrice', event.target.checked)} />Base selling price (RM)</label>
            </div>
            <p className="text-xs text-slate-500">Print at 100% / Actual size with headers and footers disabled. Choose the same paper size in your printer settings. Prices use the product master price.</p>
          </div>
          <div className="flex min-h-80 flex-col gap-3">
            <p className="text-sm font-semibold text-navy-900">Preview {job && `· ${job.count} labels · ${job.pages} ${options.layout === 'a4' ? `sheet${job.pages === 1 ? '' : 's'}` : `label${job.pages === 1 ? '' : 's'} on roll`}`}</p>
            {job ? <iframe title="Barcode label print preview" sandbox="" className="min-h-96 w-full flex-1 rounded-lg border bg-slate-100" srcDoc={`<!doctype html><html><head><style>${job.css}body { background: #e2e8f0; padding: 8px; ${options.layout === 'a4' ? 'zoom: .58;' : ''} }.label-page { background: white; margin-bottom: 8px; }</style></head><body>${job.html}</body></html>`} /> :
              <div className="flex flex-1 items-center justify-center rounded-lg border bg-slate-50 p-8 text-center text-sm text-slate-500">{error}</div>}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
          <p role="status" className="text-sm text-rose-600">{printError || (job ? '' : error)}</p>
          <div className="ml-auto flex gap-2"><button type="button" className="btn-premium-outline" onClick={onClose}>Close</button>
            <button type="button" className="btn-premium-primary disabled:opacity-50" disabled={!job} onClick={print}><Printer size={16} className="mr-2" />Print labels</button></div>
        </footer>
      </section>
    </div>
  );
}

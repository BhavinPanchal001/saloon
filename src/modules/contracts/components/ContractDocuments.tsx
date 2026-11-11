import React, { useEffect, useState } from 'react';
import { Download, Eye, FileText, Upload } from 'lucide-react';
import { fetchContractDocument, fetchContractDocumentBlob, uploadContractDocument } from '../../../services/api';
import { downloadContract, saveBlob } from './contractDownload';

type DocumentInfo = { name: string; size: number; mimeType: string; uploadedAt: string };

export default function ContractDocuments({ contract }: { contract: any }) {
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadFailed(false); setError(''); setDocument(null); setFile(null); setPreview('');
    fetchContractDocument(contract.id).then(data => { if (!cancelled) setDocument(data.document); })
      .catch(err => { if (!cancelled) { setError(err.message); setLoadFailed(true); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contract.id, reload]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const openDocument = async (download: boolean) => {
    setBusy(true); setError('');
    try {
      const blob = await fetchContractDocumentBlob(contract.id);
      if (download) saveBlob(blob, document!.name);
      else setPreview(URL.createObjectURL(new Blob([blob], { type: document!.mimeType })));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load document.'); }
    finally { setBusy(false); }
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true); setError('');
    try { const data = await uploadContractDocument(contract.id, file); setDocument(data.document); setFile(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload document.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
      <div><p className="text-sm font-semibold text-slate-900">Contract agreement</p><p className="text-xs text-slate-500 mt-1">Download saved contract details and agreement terms as HTML. Open it to print or save as PDF.</p></div>
      <button type="button" className="btn-premium-outline flex items-center gap-2" onClick={() => downloadContract(contract)}><Download className="h-4 w-4" />Download Contract</button>
    </div>
    {loading ? <p role="status" className="text-sm text-slate-500">Loading contract document...</p> : document ? <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
        <div className="flex min-w-0 items-center gap-3"><FileText className="h-8 w-8 shrink-0 text-blue-600" /><div className="min-w-0"><p className="break-words text-sm font-semibold">{document.name}</p><p className="text-xs text-slate-500 mt-1">{(document.size / 1024).toFixed(1)} KB · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p></div></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="btn-premium-outline flex items-center gap-2" onClick={() => openDocument(false)}><Eye className="h-4 w-4" />View</button><button type="button" disabled={busy} className="btn-premium-outline flex items-center gap-2" onClick={() => openDocument(true)}><Download className="h-4 w-4" />Download Document</button></div>
      </div>
      {preview && <div className="space-y-2"><button type="button" className="text-sm text-blue-700" onClick={() => setPreview('')}>Close preview</button>{document.mimeType === 'application/pdf' ? <iframe title="Uploaded contract document" src={preview} className="w-full h-[60vh] rounded-xl border border-slate-200" /> : <img src={preview} alt="Uploaded contract document" className="max-h-[60vh] w-full rounded-xl border border-slate-200 object-contain" />}</div>}
    </> : !loadFailed && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-800">No contract document uploaded</p><p className="text-xs text-slate-500 mt-1 mb-4">Attach the signed contract here. PDF, JPG or PNG, up to 10 MB.</p>
      <label className="block text-sm text-slate-700">Choose contract document<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} className="block mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:p-2 file:text-blue-700" onChange={event => {
        const selected = event.target.files?.[0] || null; setError('');
        if (selected && (selected.size > 10 * 1024 * 1024 || !/\.(pdf|jpe?g|png)$/i.test(selected.name))) { setError('Choose a PDF, JPG or PNG file up to 10 MB.'); event.target.value = ''; setFile(null); return; }
        setFile(selected);
      }} /></label>
      <button type="button" disabled={!file || busy} className="btn-premium-primary mt-4 flex items-center gap-2 disabled:opacity-50" onClick={upload}><Upload className="h-4 w-4" />{busy ? 'Uploading...' : 'Upload Document'}</button>
    </div>}
    {error && <div role="alert" className="text-sm text-rose-600">{error}<button type="button" className="ml-3 underline" disabled={busy} onClick={() => setReload(value => value + 1)}>Reload documents</button></div>}
    {busy && document && <p role="status" className="text-sm text-slate-500">Loading document...</p>}
  </div>;
}

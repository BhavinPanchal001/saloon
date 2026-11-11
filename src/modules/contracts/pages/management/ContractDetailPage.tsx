import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { fetchContractById } from '../../../../services/api';
import { ErrorState } from '../../../../components/ui/EmptyState';
import { ContractDetailsContent } from '../../components/ContractDetailsContent';

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchContractById(id).then(data => { if (!cancelled) setContract(data); }).catch(err => { if (!cancelled) setError(err.message || 'Unable to load contract.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><button type="button" className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-600" onClick={() => navigate('/contracts/list')}><ArrowLeft size={16} />Back to Contracts</button><h1 className="text-2xl font-bold text-navy-900">Contract Details</h1><p className="mt-1 text-sm text-slate-500">{contract?.employeeName || 'Saved contract information'}</p></div>
      <span className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-4 py-2 text-xs font-semibold text-navy-600"><Eye size={15} />Read only</span>
    </header>
    {loading ? <p role="status" className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={20} />Loading contract...</p> : error || !contract ? <ErrorState title="Contract not found" description={error || 'This contract does not exist.'} onRetry={() => window.location.reload()} /> : <ContractDetailsContent contract={contract} />}
  </div>;
}

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarRange, Plus, ShieldCheck, X } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { cancelLeaveRequest, createLeaveRequest, fetchLeaveContext, fetchLeaveRequests, reviewLeaveRequest } from '../../../services/api';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-900 focus:border-navy-900 focus:outline-none';
const label = 'mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500';
const primary = 'rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-50';

export default function LeaveManagementPage() {
  const user = useAuthStore(state => state.user);
  const admin = ['admin', 'super_admin'].includes(user?.role);
  const location = useLocation();
  const [form, setForm] = useState({ staffId: location.state?.staffId || '', leaveTypeId: '', startDate: today(), endDate: today(), duration: 'full', reason: '' });
  const [mode, setMode] = useState('single');
  const [open, setOpen] = useState(Boolean(location.state?.apply));
  const [context, setContext] = useState(null);
  const [requests, setRequests] = useState([]);
  const [all, setAll] = useState(admin);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const loadContext = useCallback(() => fetchLeaveContext({ ...(form.staffId && admin ? { staffId: form.staffId } : {}), date: form.startDate }), [admin, form.staffId, form.startDate]);
  const refresh = useCallback(async () => {
    const [c, r] = await Promise.all([loadContext(), fetchLeaveRequests(all)]);
    setContext(c); setRequests(r);
  }, [loadContext, all]);
  useEffect(() => {
    let active = true;
    setContext(null);
    Promise.all([loadContext(), fetchLeaveRequests(all)]).then(([c, r]) => { if (active) { setContext(c); setRequests(r); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [loadContext, all]);
  const update = (key, value) => setForm(f => ({ ...f, [key]: value, ...(key === 'startDate' && value > f.endDate ? { endDate: value } : {}), ...(['staffId', 'startDate'].includes(key) ? { leaveTypeId: '' } : {}) }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await createLeaveRequest({ ...form, endDate: mode === 'single' ? form.startDate : form.endDate, ...(admin ? {} : { staffId: undefined }) });
      setMessage('Leave request submitted. It is pending admin approval.'); setForm(f => ({ ...f, reason: '' })); setOpen(false); await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const review = async (id, decision) => {
    const note = decision === 'rejected' ? window.prompt('Optional reason for rejection:', '') : '';
    if (note === null) return;
    setBusy(true); setError(''); setMessage('');
    try { await reviewLeaveRequest(id, decision, note); setMessage(`Request ${decision}.`); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const cancel = async (id, status) => {
    let reason = '';
    if (status === 'approved') {
      reason = window.prompt('Enter a reason for cancelling this approved leave:', '');
      if (reason === null) return;
      if (!reason.trim()) { setError('A reason is required to cancel approved leave.'); return; }
    } else if (!window.confirm('Cancel this pending leave request?')) return;
    setBusy(true); setError(''); setMessage('');
    try { await cancelLeaveRequest(id, reason); setMessage('Request cancelled.'); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-navy-900">Leave management</h1><p className="mt-1 text-sm text-slate-500">View requests, contract balances and approval status.</p></div><button className={primary} onClick={() => { setError(''); setOpen(true); }}><Plus className="mr-1 inline h-4 w-4" /> Apply Leave</button></div>
    {!open && error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {message && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="mb-3 text-lg font-bold text-navy-900">Contract balances {context?.contract && <span className="text-sm font-normal text-slate-500">({context.contract.code})</span>}</h2>
      <div className="grid gap-3 sm:grid-cols-3">{context?.balances?.map(b => <div key={b.id} className="rounded-xl bg-slate-50 p-3"><div className="font-semibold">{b.name}</div><div className="text-sm text-slate-600">{b.remaining} remaining · {b.used} approved · {b.entitlement} entitled</div></div>)}</div>
      {!context?.contract && <p className="text-sm text-slate-500">No active contract for the selected employee and date.</p>}
      <p className="mt-3 text-xs text-slate-500">Earlier attendance records have no leave type and are not included in these balances.</p>
    </section>
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-navy-900">Leave history</h2>{admin && <label className="text-sm"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Show all employees</label>}</div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Employee</th><th className="p-2">Leave type</th><th className="p-2">Dates</th><th className="p-2">Days</th><th className="p-2">Reason</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead><tbody>{requests.map(r => <tr key={r.id} className="border-b"><td className="p-2">{r.staffName}</td><td className="p-2">{r.leaveTypeName}</td><td className="p-2 whitespace-nowrap">{r.start_date} – {r.end_date}</td><td className="p-2">{r.days}</td><td className="p-2">{r.reason}{r.review_note && <div className="text-slate-500">{r.status === 'cancelled' ? 'Cancellation reason' : 'Review'}: {r.review_note}</div>}</td><td className="p-2 capitalize">{r.status}</td><td className="p-2"><div className="flex gap-3">{r.status === 'pending' && admin && Number(r.staff_id) !== Number(context?.ownStaffId) && <><button disabled={busy} className="font-semibold text-emerald-700" onClick={() => review(r.id, 'approved')}>Approve</button><button disabled={busy} className="font-semibold text-rose-700" onClick={() => review(r.id, 'rejected')}>Reject</button></>}{(r.status === 'pending' || (r.status === 'approved' && admin && Number(r.staff_id) !== Number(context?.ownStaffId))) && <button disabled={busy} className="font-semibold text-slate-600" onClick={() => cancel(r.id, r.status)}>Cancel</button>}</div></td></tr>)}</tbody></table>{!requests.length && <p className="py-4 text-sm text-slate-500">No leave requests yet.</p>}</div>
    </section>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={() => !busy && setOpen(false)}><div role="dialog" aria-modal="true" aria-labelledby="leave-title" className="relative my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-5 text-white"><div className="flex items-center gap-3"><CalendarRange className="h-6 w-6 text-gold-400" /><div><h2 id="leave-title" className="text-lg font-bold">Apply Employee Leave</h2><p className="text-xs text-slate-300">Validated against the employee's contract and leave balance</p></div></div><button type="button" aria-label="Close" disabled={busy} onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
      <form onSubmit={submit} className="space-y-4 p-6">
        <div><label className={label}>Employee</label>{admin ? <select className={field} value={form.staffId} onChange={e => update('staffId', e.target.value)}><option value="">My employee record</option>{context?.staffList?.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select> : <div className={`${field} bg-slate-50`}>{context?.staff ? `${context.staff.first_name} ${context.staff.last_name}` : 'Your linked employee record'}</div>}</div>
        {context?.contract ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700"><div className="flex items-center gap-2 font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-blue-600" /> Contract: {context.contract.code}</div><p className="mt-1">Validity: {context.contract.startDate} to {context.contract.endDate || 'Ongoing'}</p></div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No active contract found for this date. Your login must be linked to an employee record.</div>}
        <div><label className={label} htmlFor="leave-type">Leave Type (Contract Allocation) *</label><select id="leave-type" required className={field} value={form.leaveTypeId} onChange={e => update('leaveTypeId', e.target.value)}><option value="">Select leave type</option>{context?.balances?.map(b => <option key={b.id} value={b.id}>{b.name} — {b.remaining} days remaining{b.documentRequired ? ' (document required)' : ''}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><div><span className={label}>Leave Mode</span><div className="grid grid-cols-2 rounded-xl border bg-slate-50 p-1">{[['single','Single Day'],['range','Date Range']].map(([v, text]) => <button type="button" key={v} onClick={() => setMode(v)} className={`rounded-lg py-1.5 text-xs font-bold ${mode === v ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>{text}</button>)}</div></div><div><span className={label}>Duration</span><div className="grid grid-cols-2 rounded-xl border bg-slate-50 p-1">{[['full','Full Day'],['half','Half Day (0.5)']].map(([v, text]) => <button type="button" key={v} onClick={() => update('duration', v)} className={`rounded-lg py-1.5 text-xs font-bold ${form.duration === v ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>{text}</button>)}</div></div></div>
        <div className="grid grid-cols-2 gap-3"><label className={label}>{mode === 'single' ? 'Leave Date' : 'Start Date'} *<input required type="date" className={field} value={form.startDate} onChange={e => update('startDate', e.target.value)} /></label>{mode === 'range' && <label className={label}>End Date *<input required type="date" min={form.startDate} className={field} value={form.endDate} onChange={e => update('endDate', e.target.value)} /></label>}</div>
        <label className={label}>Reason *<textarea required maxLength={2000} rows={2} className={field} value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="e.g. Medical emergency, family function" /></label>
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Your request will remain pending until an admin reviews it. The balance changes only after approval.</p>
        {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600" onClick={() => setOpen(false)}>Cancel</button><button className={primary} disabled={busy || !context?.contract}>Submit Request</button></div>
      </form></div></div>}
  </div>;
}

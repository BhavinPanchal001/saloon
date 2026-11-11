import React from 'react';
import ContractDocuments from './ContractDocuments';

const show = (value: any) => value === undefined || value === null || value === '' ? 'Not configured' : String(value);

const Facts = ({ fields }: { fields: [string, any][] }) => <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500 mb-1">{label}</dt><dd className="text-sm font-semibold text-slate-900 break-words">{show(value)}</dd></div>)}</dl>;
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="glass-card"><h3 className="text-base font-bold text-slate-900 mb-5">{title}</h3>{children}</section>;

export function ContractDetailsContent({ contract }: { contract: any }) {
  const leaves = contract.leaveAllocations || [];
  const holidays = contract.holidays || [];
  const days = contract.operationalDays || [];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Section title="Documents"><ContractDocuments key={contract.id} contract={contract} /></Section>
      <Section title="Contract Information"><Facts fields={[
        ['Contract', contract.title], ['Previous Contract ID', contract.previousContractId || 'Original contract'], ['Version', contract.currentVersion], ['Contract Code', contract.code], ['Status', contract.effectiveStatus || contract.status], ['Contract Type', contract.typeName],
        ['Start Date', contract.startDate], ['End Date', contract.endDate || 'Ongoing'],
        ['Probation Period', contract.probationPeriodMonths == null ? null : `${contract.probationPeriodMonths} months`],
        ['Notice Period', contract.noticePeriodDays == null ? null : `${contract.noticePeriodDays} days`],
      ]} /></Section>
      <Section title="Work Schedule"><Facts fields={[
        ['Operational Shift', contract.shiftName], ['Shift Hours', contract.shiftStartTime && contract.shiftEndTime ? `${contract.shiftStartTime} – ${contract.shiftEndTime}` : null],
        ['Work Week', contract.workWeekName], ['Working Days', days.length ? days.join(', ') : null],
        ['Weekly Off', contract.workWeekId && days.length ? (contract.weeklyOffPattern?.join(', ') || 'None') : null],
      ]} /></Section>
      <Section title="Leave & Holiday Configuration">
        <div className="grid gap-6 sm:grid-cols-2">
          <div><h4 className="text-sm font-semibold text-slate-700 mb-3">Leave Types ({leaves.length})</h4>
            {leaves.length ? <ul className="space-y-2">{leaves.map((leave: any) => <li key={leave.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-sm font-medium text-slate-800">{leave.name}</div><div className="text-xs text-slate-500 mt-1">{leave.count} days/year · {leave.isPaid ? 'Paid' : 'Unpaid'}</div></li>)}</ul> : <p className="text-sm text-slate-500">{contract.leaveConfigurationSaved ? 'No leave types selected.' : 'Not configured. No leave selections were saved for this contract.'}</p>}
          </div>
          <div><h4 className="text-sm font-semibold text-slate-700 mb-3">Holidays ({holidays.length})</h4>
            {holidays.length ? <ul className="space-y-2">{holidays.map((holiday: any) => <li key={holiday.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-sm font-medium text-slate-800">{holiday.name}</div><div className="text-xs text-slate-500 mt-1">{holiday.startDate}{holiday.endDate && holiday.endDate !== holiday.startDate ? ` – ${holiday.endDate}` : ''}{holiday.occasionType ? ` · ${holiday.occasionType}` : ''}</div></li>)}</ul> : <p className="text-sm text-slate-500">{contract.holidayConfigurationSaved ? 'No holidays selected.' : 'Not configured. No holiday selections were saved for this contract.'}</p>}
          </div>
        </div>
      </Section>
      <Section title="Overtime">
        <p className="text-sm text-slate-600 mb-4">Overtime Work: <strong className="text-slate-900">{contract.overtime?.enabled ? 'Allowed' : 'Not allowed'}</strong></p>
      </Section>
    </div>
  );
}

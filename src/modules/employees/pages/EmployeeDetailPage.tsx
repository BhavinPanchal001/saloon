import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Loader2, Eye } from 'lucide-react';
import { fetchStaffProfile } from '../../../services/api';
import { useToastStore } from '../../../stores/toastStore';
import { ErrorState } from '../../../components/ui/EmptyState';
import { ContractDetailsContent } from '../../contracts/components/ContractDetailsContent';
import { APP_ROLES } from '../../../../shared/appRoles.js';
import '../styles/employees.css';

interface StaffMember {
  id: string | number;
  contractDetails?: any;
  employeeCode?: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  personalEmail?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  marital_status?: string;
  role?: string;
  assignedOutletName?: string;
  biometricCode?: string;
  joiningDate?: string;
  userId?: string | number | null;
  accountEnabled?: boolean;
  onboardingStatus?: string;
  address?: { street?: string; city?: string; state?: string; country?: string; pincode?: string };
  bankDetails?: { accountHolderName?: string; bankName?: string; accountNumber?: string; ifscCode?: string; branchName?: string; accountType?: string };
}

const display = (value?: string | number | null) => value === undefined || value === null || value === '' ? '?' : String(value);
const date = (value?: string) => {
  if (!value) return '?';
  const parsed = new Date(value.slice(0, 10) + 'T00:00:00');
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const countryName = (value?: string) => {
  if (!value) return '?';
  if (value.length !== 2) return value;
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(value === 'UK' ? 'GB' : value) || value; }
  catch { return value; }
};

const DetailSection: React.FC<{ title: string; fields: [string, string | number | null | undefined][] }> = ({ title, fields }) => (
  <section className="glass-card">
    <h2 className="text-base font-bold text-navy-900 mb-5">{title}</h2>
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium text-navy-400 mb-1.5">{label}</dt>
          <dd className="text-sm font-semibold text-navy-900 break-words whitespace-pre-line">{display(value)}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showError = useToastStore(state => state.error);
  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadEmployee = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) throw new Error('No employee ID provided.');
        const data = await fetchStaffProfile(id);
        if (!cancelled) setEmployee(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load employee.');
          showError('Failed to load employee details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadEmployee();
    return () => { cancelled = true; };
  }, [id, showError]);

  if (loading) return (
    <div className="employee-module flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status">
      <Loader2 className="h-10 w-10 animate-spin text-navy-500" />
      <p className="text-sm font-medium text-navy-500">Loading employee profile...</p>
    </div>
  );
  if (error || !employee) return (
    <div className="employee-module">
      <ErrorState title="Employee not found" description={error || 'The employee you are looking for does not exist.'} onRetry={() => window.location.reload()} />
    </div>
  );

  const name = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') || employee.name;
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const role = APP_ROLES.find(option => option.value === employee.role)?.label || employee.role;
  const address = employee.address || {};
  const bank = employee.bankDetails || {};
  const accountStatus = !employee.userId ? 'Not linked' : employee.accountEnabled === undefined ? 'Unavailable' : employee.accountEnabled ? 'Enabled' : 'Disabled';

  return (
    <div className="employee-module">
      <header className="module-header flex-wrap gap-4">
        <div className="module-title">
          <button type="button" onClick={() => navigate('/staff')} className="flex items-center gap-1.5 text-navy-600 hover:text-navy-900 font-bold mb-2" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={16} /> Back to List
          </button>
          <h1>Employee Details</h1>
          <p>View the employee's saved information.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-navy-50 px-4 py-2 text-xs font-semibold text-navy-600"><Eye size={15} /> Read only</span>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="glass-card text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 mx-auto mb-5 flex items-center justify-center text-2xl font-bold text-navy-600">{initials}</div>
          <h2 className="text-xl font-semibold break-words">{name}</h2>
          <p className="text-sm text-navy-500 font-medium mt-2">{display(role)}</p>
          <p className="text-xs text-navy-400 mt-2">{display(employee.employeeCode)}</p>
          <div className="mt-6 text-left border-t border-navy-100 pt-5 space-y-4">
            <p className="flex items-start gap-3 text-navy-600 text-sm"><Phone size={17} className="shrink-0 mt-0.5" /><span className="break-all">{display(employee.phone)}</span></p>
            <p className="flex items-start gap-3 text-navy-600 text-sm"><Mail size={17} className="shrink-0 mt-0.5" /><span className="break-all">{display(employee.personalEmail)}</span></p>
            <p className="flex items-start gap-3 text-navy-600 text-sm"><MapPin size={17} className="shrink-0 mt-0.5" /><span className="break-words">{display(employee.assignedOutletName)}</span></p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <DetailSection title="Personal Information" fields={[
            ['First Name', employee.firstName], ['Middle Name', employee.middleName], ['Last Name', employee.lastName],
            ['Personal Email', employee.personalEmail], ['Phone Number', employee.phone], ['Date of Birth', date(employee.dob)],
            ['Gender', employee.gender], ['Marital Status', employee.maritalStatus || employee.marital_status],
          ]} />
          <DetailSection title="Employment Details" fields={[
            ['Employee Code', employee.employeeCode], ['App User Role', role], ['Assigned Outlet', employee.assignedOutletName],
            ['Joining Date', date(employee.joiningDate)], ['Biometric Code', employee.biometricCode],
          ]} />
          <DetailSection title="System Access" fields={[
            ['Login Email', employee.userId ? employee.email : undefined], ['Account Status', accountStatus],
          ]} />
          <DetailSection title="Address" fields={[
            ['Street', address.street], ['City', address.city], ['State / Province', address.state],
            ['Country', countryName(address.country)], ['Pincode / ZIP', address.pincode],
          ]} />
          <section className="glass-card"><h2 className="text-base font-bold text-navy-900 mb-2">Linked Contract</h2><p className="text-sm text-slate-500">{employee.contractDetails ? 'Saved settings from the active contract, or the latest contract when none is active.' : 'No contract linked to this employee.'}</p></section>
          {employee.contractDetails && <ContractDetailsContent contract={employee.contractDetails} />}
          <DetailSection title="Bank Details" fields={[
            ['Account Holder Name', bank.accountHolderName], ['Bank Name', bank.bankName], ['Account Number', bank.accountNumber],
            ['IFSC / SWIFT Code', bank.ifscCode], ['Branch Name', bank.branchName], ['Account Type', bank.accountType],
          ]} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;

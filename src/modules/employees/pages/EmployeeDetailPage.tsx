import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Building, UserCheck, Loader2 } from 'lucide-react';
import { fetchStaffProfile, updateStaffStatus, resetStaffPassword } from "../../../services/mockApi";
import { useToastStore } from '../../../stores/toastStore';
import { ConfirmModal } from '../../../components/ui/Modal';
import { ErrorState } from '../../../components/ui/EmptyState';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import '../styles/employees.css';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  assignedOutletName: string;
  baseSalary: number;
  commissionSlab: string;
  contractFileName: string;
}

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();

  const [employee, setEmployee] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) {
        setError('No employee ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchStaffProfile(id);
        setEmployee(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employee');
        toast.error('Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id, toast]);

  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleDeactivate = async () => {
    if (!employee?.id) return;
    
    setIsDeactivating(true);
    try {
      await updateStaffStatus(employee.id, 'inactive');
      setEmployee(prev => prev ? { ...prev, status: 'inactive' } : null);
      toast.success('Employee account deactivated successfully');
      setDeactivateModalOpen(false);
    } catch (err) {
      toast.error('Failed to deactivate employee');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee?.id) return;
    
    setIsResettingPassword(true);
    try {
      const result = await resetStaffPassword(employee.id);
      toast.success(result.message);
    } catch (err) {
      toast.error('Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleViewDocuments = () => {
    setDocumentModalOpen(true);
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format salary
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="employee-module">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-navy-500" />
          <p className="text-sm font-medium text-navy-500">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-module">
        <ErrorState
          title="Employee not found"
          description={error || 'The employee you are looking for does not exist.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="employee-module">
      <header className="module-header">
        <div className="module-title">
          <button
            onClick={() => navigate('/staff')}
            className="flex items-center gap-1.5 text-navy-600 hover:text-navy-900 font-bold transition-colors mb-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <h1>Employee Profile</h1>
        </div>
        <button
          className="btn-premium-primary"
          onClick={() => navigate(`/staff/edit/${id}`)}
        >
          <Edit size={18} />
          Edit Profile
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Left Column: Summary Card */}
        <div className="flex flex-col gap-6">
          <div className="glass-card text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-navy-600">
              {getInitials(employee.name)}
            </div>
            <h2 className="text-xl font-semibold mb-1">{employee.name}</h2>
            <p className="text-navy-500 font-medium mb-3">{employee.role}</p>
            <span className="status-badge status-active">Active</span>

            <div className="mt-6 text-left border-t border-navy-100 pt-5 space-y-3">
              <div className="flex items-center gap-3 text-navy-500 text-sm">
                <Mail size={18} />
                <span>{employee.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-navy-500 text-sm">
                <MapPin size={18} />
                <span>{employee.assignedOutletName}</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <button
                className="btn-premium-outline w-full !justify-start"
                onClick={handleViewDocuments}
              >
                View Documents
              </button>
              <button
                className="btn-premium-outline w-full !justify-start"
                onClick={handleResetPassword}
              >
                Reset Password
              </button>
              <button
                className="btn-premium w-full !justify-start !text-rose-600 !border-rose-200 !bg-rose-50 hover:!bg-rose-100"
                onClick={() => setDeactivateModalOpen(true)}
              >
                Deactivate Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="flex flex-col gap-6">
          <div className="glass-card">
            <h3 className="form-section-title mt-0">Employment Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Employee ID</label>
                <div className="font-semibold text-navy-900">{employee.id}</div>
              </div>
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Role</label>
                <div className="font-semibold text-navy-900">{employee.role}</div>
              </div>
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Assigned Outlet</label>
                <div className="font-semibold text-navy-900">{employee.assignedOutletName}</div>
              </div>
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Commission Slab</label>
                <div className="font-semibold text-navy-900">{employee.commissionSlab}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="form-section-title mt-0">Salary Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Base Salary</label>
                <div className="font-semibold text-navy-900">{formatSalary(employee.baseSalary)}</div>
              </div>
              <div>
                <label className="text-xs text-navy-400 uppercase tracking-wider block mb-1">Commission Tier</label>
                <div className="font-semibold text-navy-900">{employee.commissionSlab}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="form-section-title mt-0">Documents</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-navy-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-rose-600">PDF</span>
                  </div>
                  <div>
                    <div className="font-medium text-navy-900">Employment Contract</div>
                    <div className="text-xs text-navy-400">{employee.contractFileName}</div>
                  </div>
                </div>
                <button className="btn-premium-outline !py-2 !px-3 text-xs">
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee Account"
        message={`Are you sure you want to deactivate ${employee.name}'s account? This will prevent them from accessing the system.`}
        confirmText="Deactivate"
        variant="danger"
      />

      <DocumentViewerModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        employeeName={employee?.name || ''}
      />
    </div>
  );
};

export default EmployeeDetailPage;

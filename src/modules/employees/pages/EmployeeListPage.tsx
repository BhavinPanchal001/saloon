import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { EmployeeFilters } from '../components/EmployeeFilters';
import { EmployeeTable } from '../components/EmployeeTable/EmployeeTable';
import { EmployeeBulkImport } from '../components/EmployeeBulkImport';
import { fetchStaff, deleteEmployee } from '../../../services/api';
import { useToastStore } from '../../../stores/toastStore';
import { ConfirmModal } from '../../../components/ui/Modal';
import { EmptyTable } from '../../../components/ui/EmptyState';
import '../styles/employees.css';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  assignedOutletName: string;
  baseSalary: number;
  status?: string;
}

const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();

  const [allEmployees, setAllEmployees] = useState<StaffMember[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ department: '', status: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        const data = await fetchStaff();
        setAllEmployees(data);
        setFilteredEmployees(data);
      } catch (err) {
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // Apply search and filters
  useEffect(() => {
    let result = [...allEmployees];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        emp =>
          emp.name.toLowerCase().includes(query) ||
          emp.id.toLowerCase().includes(query) ||
          emp.role.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.department) {
      // Note: Staff members don't have department in current schema
      // This would need schema update for full functionality
    }

    if (filters.status) {
      result = result.filter(emp => emp.status === filters.status || !emp.status);
    }

    setFilteredEmployees(result);
  }, [searchQuery, filters, allEmployees]);

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const total = allEmployees.length;
    const active = allEmployees.filter(e => !e.status || e.status === 'Active').length;
    const onLeave = allEmployees.filter(e => e.status === 'On Leave').length;
    // Get unique roles as "departments"
    const uniqueRoles = new Set(allEmployees.map(e => e.role)).size;

    return { total, active, onLeave, uniqueRoles };
  }, [allEmployees]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: { department?: string; status?: string }) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleBulkImport = (newEmployees: StaffMember[]) => {
    setAllEmployees(prev => [...prev, ...newEmployees]);
    setFilteredEmployees(prev => [...prev, ...newEmployees]);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      await deleteEmployee(employeeToDelete);
      setAllEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
      setFilteredEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
      toast.success('Employee removed successfully');
    } catch (err) {
      toast.error('Failed to delete employee');
    } finally {
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="employee-module">
        <header className="module-header">
          <div className="module-title">
            <h1>Employee Management</h1>
            <p>Organize, view, and manage your workforce with ease.</p>
          </div>
        </header>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-navy-500" />
          <p className="text-sm font-medium text-navy-500">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-module">
      <header className="module-header">
        <div className="module-title">
          <h1>Employee Management</h1>
          <p>Organize, view, and manage your workforce with ease.</p>
        </div>
      </header>

      {/* Stats Summary Panel - Now derived from actual data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Total Employees</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Active</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.active}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">On Leave</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{stats.onLeave}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm text-navy-500 font-medium">Unique Roles</div>
          <div className="text-2xl font-bold mt-1">{stats.uniqueRoles}</div>
        </div>
      </div>

      <EmployeeFilters
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onAddClick={() => navigate('/staff/add')}
        onImportClick={() => setBulkImportOpen(true)}
      />

      {filteredEmployees.length === 0 ? (
        <EmptyTable
          title={searchQuery ? "No matching employees" : "No employees yet"}
          description={
            searchQuery
              ? "Try adjusting your search or filters"
              : "Get started by adding your first employee"
          }
          actionLabel="Add Employee"
          onAction={() => navigate('/staff/add')}
        />
      ) : (
        <EmployeeTable
          employees={filteredEmployees}
          onView={(id) => navigate(`/staff/${id}`)}
          onEdit={(id) => navigate(`/staff/edit/${id}`)}
          onDelete={handleDeleteClick}
        />
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Remove Employee"
        message="Are you sure you want to remove this employee? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />

      <EmployeeBulkImport
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default EmployeeListPage;

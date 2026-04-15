import React from 'react';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Building, UserCheck } from 'lucide-react';
import '../styles/employees.css';

const EmployeeDetailPage: React.FC = () => {
  // Mock data for display
  const emp = {
    name: 'Alex Rivera',
    id: 'EMP-001',
    role: 'Senior Developer',
    dept: 'Engineering',
    status: 'Active',
    email: 'alex.r@personal.com',
    companyEmail: 'arivera@company.com',
    phone: '+1 234 567 8901',
    joined: 'Feb 01, 2023',
    location: 'Denver Office',
    bank: {
      account: '**** **** 1234',
      bank: 'JP Morgan Chase'
    }
  };

  return (
    <div className="employee-module">
      <header className="module-header">
        <div className="module-title">
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: 'var(--emp-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              padding: 0,
              marginBottom: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <h1>Employee Profile</h1>
        </div>
        <button className="btn btn-primary">
          <Edit size={18} />
          Edit Profile
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
        {/* Left Column: Summary Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: '#e2e8f0',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#64748b'
            }}>
              AR
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>{emp.name}</h2>
            <p style={{ color: 'var(--emp-text-muted)', fontWeight: '500', margin: '0 0 1rem' }}>{emp.role}</p>
            <span className={`status-badge status-active`}>{emp.status}</span>

            <div style={{ marginTop: '2rem', textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', color: 'var(--emp-text-muted)', fontSize: '0.875rem' }}>
                <Mail size={18} /> {emp.companyEmail}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', color: 'var(--emp-text-muted)', fontSize: '0.875rem' }}>
                <Phone size={18} /> {emp.phone}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--emp-text-muted)', fontSize: '0.875rem' }}>
                <MapPin size={18} /> {emp.location}
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%' }}>View Documents</button>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%' }}>Reset Password</button>
              <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%', color: '#ef4444' }}>Deactivate Account</button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-card">
            <h3 className="form-section-title" style={{ marginTop: 0 }}>Employment Information</h3>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Employee Code</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>{emp.id}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Department</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>{emp.dept}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Joining Date</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>{emp.joined}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Reporting Manager</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>Jane Smith</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="form-section-title" style={{ marginTop: 0 }}>Financial Information</h3>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Bank Name</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>{emp.bank.bank}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Account Number</label>
                <div style={{ fontWeight: '600', marginTop: '0.25rem' }}>{emp.bank.account}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="form-section-title" style={{ marginTop: 0 }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1.5rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emp-primary)' }}></div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Onboarded to Engineering Team</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Feb 01, 2023 • System</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1.5rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Documents Verified</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Jan 20, 2023 • Admin</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;

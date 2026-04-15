import React from 'react';
import { Upload, File, Check, X, AlertCircle } from 'lucide-react';

export const DocumentSection: React.FC = () => {
  const documents = [
    { name: 'National ID / Passport', status: 'Verified', date: '2024-01-10' },
    { name: 'Educational Certificates', status: 'Pending', date: '2024-02-15' },
  ];

  return (
    <div>
      <h3 className="form-section-title">KYC & Documents</h3>
      
      <div className="glass-card" style={{ padding: '1rem', borderStyle: 'dashed', textAlign: 'center', marginBottom: '2rem' }}>
        <Upload size={24} style={{ color: 'var(--emp-primary)', marginBottom: '0.5rem' }} />
        <p style={{ fontWeight: '500' }}>Drop files here or click to upload</p>
        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>PDF, JPG, PNG (Max 5MB)</p>
        <button className="btn btn-outline" style={{ marginTop: '0.5rem' }}>Select Files</button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {documents.map((doc, i) => (
          <div key={i} className="glass-card" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                <File size={20} color="#3b82f6" style={{ margin: 'auto' }} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{doc.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Uploaded on {doc.date}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {doc.status === 'Verified' ? (
                  <Check size={16} color="#10b981" />
                ) : (
                  <AlertCircle size={16} color="#f59e0b" />
                )}
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  color: doc.status === 'Verified' ? '#10b981' : '#f59e0b'
                }}>
                  {doc.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button title="View" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><File size={16} /></button>
                <button title="Delete" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

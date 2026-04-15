import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Contracts', path: '/contracts/list' },
  { label: 'Contract Groups', path: '/contracts/groups' },
  { label: 'Masters', path: '/contracts/masters' },
];

const ContractModuleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Module Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contract Management</h1>
            <p className="text-sm text-slate-500">Manage employee agreements, salary structures, and compliance.</p>
          </div>
          <div className="flex gap-3">
             {/* Global Module Actions could go here */}
          </div>
        </div>

        {/* Sub Navigation */}
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
              `}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
};

export default ContractModuleLayout;

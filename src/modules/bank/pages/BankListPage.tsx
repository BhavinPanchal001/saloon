import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Building2, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Star,
  CreditCard,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  History,
  X,
  Wallet,
  Landmark
} from 'lucide-react';
import { useBankStore } from '../../../stores/bankStore';
import { Bank, BankTransaction } from '../types';
import { formatCurrency } from '../../../utils/format';
import { PageHeader } from '../../../components/ui/PageHeader';
import '../styles/bank.css';

const BankListPage: React.FC = () => {
  const navigate = useNavigate();
  const { banks, deleteBank, setDefaultBank, deposit, withdraw, transfer, getTransactions, fetchBanks, loading, error } = useBankStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Transaction modals
  const [showAddMoneyModal, setShowAddMoneyModal] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<BankTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    let result = [...banks];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        bank =>
          bank.bankName.toLowerCase().includes(query) ||
          bank.accountHolderName.toLowerCase().includes(query) ||
          bank.accountNumber.includes(query) ||
          bank.ifscCode.toLowerCase().includes(query)
      );
    }
    
    // Sort: default first, then active, then by name
    return result.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return b.isDefault ? 1 : -1;
      if (a.isActive !== b.isActive) return b.isActive ? 1 : -1;
      return a.bankName.localeCompare(b.bankName);
    });
  }, [banks, searchQuery]);

  const stats = useMemo(() => {
    const total = banks.length;
    const active = banks.filter(b => b.isActive).length;
    const defaultCount = banks.filter(b => b.isDefault).length;
    const totalBalance = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
    return { total, active, defaultCount, totalBalance };
  }, [banks]);

  const handleDelete = async (id: string) => {
    try {
      await deleteBank(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete bank.');
    }
    setShowDeleteConfirm(null);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBank(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to set default bank.');
    }
  };

  const handleOpenHistory = async (bankId: string) => {
    setShowHistoryModal(bankId);
    setHistoryLoading(true);
    try {
      const txns = await getTransactions(bankId);
      setHistoryTransactions(Array.isArray(txns) ? txns : []);
    } catch {
      setHistoryTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="bank-module">
      {/* Header */}
      <PageHeader
        title="Bank Management"
        description="Manage your bank accounts for transactions, payments, and receipts."
        action={
          <button
            className="btn-premium-primary flex items-center gap-2"
            onClick={() => navigate('/bank/new')}
          >
            <Plus className="w-4 h-4" />
            Add Bank Account
          </button>
        }
      />

      {/* Stats */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-5 mb-3">
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Banks</span>
          <span className="text-base font-bold text-navy-900">{stats.total}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Active Accounts</span>
          <span className="text-base font-bold text-emerald-600">{stats.active}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Default Account</span>
          <span className="text-base font-bold text-gold-600">{stats.defaultCount}</span>
        </div>
        <div className="glass-card !p-2.5 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Inactive</span>
          <span className="text-base font-bold text-slate-500">{stats.total - stats.active}</span>
        </div>
        <div className="glass-card !p-2.5 bg-gold-50/50 border-gold-200 flex items-center justify-between px-3">
          <span className="text-xs text-navy-600 font-medium">Total Balance</span>
          <span className="text-base font-bold text-gold-700">{formatCurrency(stats.totalBalance)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
          <input
            type="text"
            placeholder="Search by bank name, account holder, or account number..."
            className="premium-input pl-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error Banner */}
      {(actionError || error) && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center justify-between">
          <span>{actionError || error}</span>
          <button onClick={() => setActionError(null)} className="ml-2 text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && banks.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-navy-500">Loading bank accounts...</p>
        </div>
      )}

      {/* Banks Grid */}
      {!loading && filteredBanks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="bank-empty-state-icon">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">
            {searchQuery ? 'No banks found' : 'No banks yet'}
          </h3>
          <p className="text-sm text-navy-500 max-w-md mx-auto mb-6">
            {searchQuery 
              ? 'Try adjusting your search query to find what you are looking for.'
              : 'Add your first bank account to use it in sales, expenses, and purchase orders.'}
          </p>
          {!searchQuery && (
            <button
              className="btn-premium-primary"
              onClick={() => navigate('/bank/new')}
            >
              Add First Bank Account
            </button>
          )}
        </div>
      ) : (
        <div className="bank-grid">
          {filteredBanks.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              onEdit={() => navigate(`/bank/edit/${bank.id}`)}
              onDelete={() => setShowDeleteConfirm(String(bank.id))}
              onSetDefault={() => handleSetDefault(String(bank.id))}
              onAddMoney={() => setShowAddMoneyModal(String(bank.id))}
              onTransfer={() => setShowTransferModal(String(bank.id))}
              onHistory={() => handleOpenHistory(String(bank.id))}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteModal
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
        />
      )}

      {/* Add Money Modal */}
      {showAddMoneyModal && (
        <AddMoneyModal
          bank={banks.find(b => String(b.id) === showAddMoneyModal)!}
          onClose={() => setShowAddMoneyModal(null)}
          onDeposit={async (amount, description, reference) => {
            try {
              await deposit(showAddMoneyModal, amount, description, reference);
              setShowAddMoneyModal(null);
            } catch (err: any) {
              setActionError(err.message || 'Deposit failed.');
            }
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          fromBank={banks.find(b => String(b.id) === showTransferModal)!}
          otherBanks={banks.filter(b => String(b.id) !== showTransferModal && b.isActive)}
          onClose={() => setShowTransferModal(null)}
          onTransfer={async (toBankId, amount, description) => {
            const success = await transfer({
              fromBankId: showTransferModal,
              toBankId,
              amount,
              description,
            });
            if (success) {
              setShowTransferModal(null);
            } else {
              throw new Error(useBankStore.getState().error || 'Transfer failed.');
            }
          }}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <HistoryModal
          bank={banks.find(b => String(b.id) === showHistoryModal)!}
          transactions={historyTransactions}
          loading={historyLoading}
          onClose={() => { setShowHistoryModal(null); setHistoryTransactions([]); }}
        />
      )}
    </div>
  );
};

interface BankCardProps {
  bank: Bank;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onAddMoney: () => void;
  onTransfer: () => void;
  onHistory: () => void;
}

const BankCard: React.FC<BankCardProps> = ({ bank, onEdit, onDelete, onSetDefault, onAddMoney, onTransfer, onHistory }) => {
  return (
    <div className={`bank-card ${bank.isDefault ? 'default' : ''} ${!bank.isActive ? 'inactive' : ''}`}>
      <div className="bank-card-header">
        <div className="flex items-center gap-4">
          <div className={`bank-icon ${bank.isDefault ? 'default' : ''}`}>
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="bank-name">{bank.bankName}</h3>
            <p className="bank-account-number">{bank.accountNumber}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {bank.isDefault && (
            <span className="bank-badge default">
              <Star className="w-3 h-3 mr-1" />
              Default
            </span>
          )}
          <span className={`bank-badge ${bank.isActive ? 'active' : 'inactive'}`}>
            {bank.isActive ? (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
            )}
          </span>
        </div>
      </div>

      {/* Balance Display */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
          <Wallet className="w-4 h-4" />
          Current Balance
        </div>
        <div className="text-2xl font-bold text-navy-900">
          {formatCurrency(bank.balance || 0)}
        </div>
      </div>

      <div className="bank-details">
        <div className="bank-detail-row">
          <span className="bank-detail-label">Account Holder</span>
          <span className="bank-detail-value">{bank.accountHolderName}</span>
        </div>
        <div className="bank-detail-row">
          <span className="bank-detail-label">IFSC Code</span>
          <span className="bank-detail-value font-mono">{bank.ifscCode}</span>
        </div>
        <div className="bank-detail-row">
          <span className="bank-detail-label">Branch</span>
          <span className="bank-detail-value">{bank.branchName}</span>
        </div>
        {bank.branchAddress && (
          <div className="bank-detail-row">
            <span className="bank-detail-label">Address</span>
            <span className="bank-detail-value text-right max-w-[60%]">{bank.branchAddress}</span>
          </div>
        )}
      </div>

      {/* Transaction Actions */}
      {bank.isActive && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={onAddMoney}
            className="flex-1 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Add Money
          </button>
          <button
            onClick={onTransfer}
            className="flex-1 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </button>
          <button
            onClick={onHistory}
            className="flex-1 py-2 text-sm font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      )}

      {/* Edit/Delete Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 text-sm font-medium text-navy-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        {!bank.isDefault && (
          <button
            onClick={onSetDefault}
            className="flex-1 py-2 text-sm font-medium text-gold-700 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" />
            Set Default
          </button>
        )}
        <button
          onClick={onDelete}
          className="py-2 px-4 text-sm font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Modal Components
interface DeleteModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
      <div className="flex items-center gap-3 text-rose-600">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-lg font-bold text-slate-900">Delete Bank Account</h3>
      </div>
      <p className="text-slate-600">
        Are you sure you want to delete this bank account? This action cannot be undone.
      </p>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 px-6 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

interface AddMoneyModalProps {
  bank: Bank;
  onClose: () => void;
  onDeposit: (amount: number, description: string, reference?: string) => Promise<void>;
}

const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ bank, onClose, onDeposit }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await onDeposit(numAmount, description || 'Deposit', reference || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-emerald-600">
            <ArrowDownLeft className="w-8 h-8" />
            <h3 className="text-lg font-bold text-slate-900">Add Money</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-500">To Account</p>
          <p className="font-semibold text-navy-900">{bank.bankName}</p>
          <p className="text-sm text-slate-600">{bank.accountNumber}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="premium-input mt-1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input
              type="text"
              placeholder="e.g., Cash deposit, Sales collection"
              className="premium-input mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Reference Number (Optional)</label>
            <input
              type="text"
              placeholder="Transaction reference"
              className="premium-input mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 px-6 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Money'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TransferModalProps {
  fromBank: Bank;
  otherBanks: Bank[];
  onClose: () => void;
  onTransfer: (toBankId: string, amount: number, description: string) => Promise<void>;
}

const TransferModal: React.FC<TransferModalProps> = ({ fromBank, otherBanks, onClose, onTransfer }) => {
  const [toBankId, setToBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!toBankId) {
      setError('Please select destination bank');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (numAmount > fromBank.balance) {
      setError('Insufficient balance');
      return;
    }
    setSubmitting(true);
    try {
      await onTransfer(toBankId, numAmount, description || 'Transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-blue-600">
            <ArrowRightLeft className="w-8 h-8" />
            <h3 className="text-lg font-bold text-slate-900">Transfer Money</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-500">From Account</p>
          <p className="font-semibold text-navy-900">{fromBank.bankName}</p>
          <p className="text-sm text-slate-600">Balance: {formatCurrency(fromBank.balance)}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">To Account *</label>
            <select
              className="premium-input mt-1"
              value={toBankId}
              onChange={(e) => { setToBankId(e.target.value); setError(''); }}
            >
              <option value="">Select destination bank</option>
              {otherBanks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.bankName} - {bank.accountNumber} ({formatCurrency(bank.balance)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={fromBank.balance}
              placeholder="0.00"
              className="premium-input mt-1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input
              type="text"
              placeholder="e.g., Fund transfer"
              className="premium-input mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={otherBanks.length === 0 || submitting}
            className="flex-1 py-3 px-6 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Transferring...' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface HistoryModalProps {
  bank: Bank;
  transactions: BankTransaction[];
  loading?: boolean;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ bank, transactions, loading = false, onClose }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
      case 'withdrawal':
      case 'transfer_out':
        return <ArrowUpRight className="w-4 h-4 text-rose-600" />;
      default:
        return <History className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return 'text-emerald-600';
      case 'withdrawal':
      case 'transfer_out':
        return 'text-rose-600';
      default:
        return 'text-slate-600';
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-navy-600">
            <Landmark className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Transaction History</h3>
              <p className="text-sm text-slate-500">{bank.bankName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
          <span className="text-sm text-slate-500">Current Balance</span>
          <span className="text-xl font-bold text-navy-900">{formatCurrency(bank.balance)}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map((txn) => (
              <div key={txn.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      {getTransactionIcon(txn.type)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{formatType(txn.type)}</p>
                      <p className="text-xs text-slate-500">{txn.description}</p>
                      {txn.referenceNumber && (
                        <p className="text-xs text-slate-400">Ref: {txn.referenceNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(txn.type)}`}>
                      {txn.type === 'withdrawal' || txn.type === 'transfer_out' ? '-' : '+'}
                      {formatCurrency(txn.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default BankListPage;

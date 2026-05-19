import { create } from 'zustand';
import { Bank, BankFormData, BankTransaction, TransferFormData } from '../modules/bank/types';
import {
  fetchBanksFromAPI,
  createBankAPI,
  updateBankAPI,
  deleteBankAPI,
  setDefaultBankAPI,
  depositAPI,
  withdrawAPI,
  transferAPI,
  fetchBankTransactionsFromAPI,
} from '../services/api';

interface BankStore {
  banks: Bank[];
  defaultBank: Bank | null;
  transactions: Record<string, BankTransaction[]>;
  loading: boolean;
  error: string | null;

  // CRUD operations
  fetchBanks: () => Promise<void>;
  addBank: (data: BankFormData) => Promise<Bank>;
  updateBank: (id: string, data: Partial<BankFormData>) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  getBankById: (id: string) => Bank | undefined;
  getActiveBanks: () => Bank[];
  getDefaultBank: () => Bank | null;
  setDefaultBank: (id: string) => Promise<void>;

  // Transaction operations
  deposit: (bankId: string, amount: number, description: string, referenceNumber?: string) => Promise<void>;
  withdraw: (bankId: string, amount: number, description: string, referenceNumber?: string) => Promise<boolean>;
  transfer: (data: TransferFormData) => Promise<boolean>;
  getTransactions: (bankId: string) => Promise<BankTransaction[]>;
  getBankBalance: (bankId: string) => number;

  // For use in other modules (sale, expense, purchase order)
  getBankOptions: () => { value: string; label: string }[];
}

const computeDefaultBank = (banks: Bank[]): Bank | null =>
  banks.find(b => b.isDefault && b.isActive) ||
  banks.find(b => b.isActive) ||
  null;

export const useBankStore = create<BankStore>()((set, get) => ({
  banks: [],
  defaultBank: null,
  transactions: {},
  loading: false,
  error: null,

  fetchBanks: async () => {
    set({ loading: true, error: null });
    try {
      const data: Bank[] = await fetchBanksFromAPI();
      set({ banks: data, defaultBank: computeDefaultBank(data), loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load banks.' });
    }
  },

  addBank: async (data: BankFormData) => {
    set({ loading: true, error: null });
    try {
      const bank: Bank = await createBankAPI(data);
      const banks = [...get().banks, bank];
      if (data.isDefault) {
        banks.forEach(b => { if (b.id !== bank.id) b.isDefault = false; });
      }
      set({ banks, defaultBank: computeDefaultBank(banks), loading: false });
      return bank;
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to create bank.' });
      throw err;
    }
  },

  updateBank: async (id: string, data: Partial<BankFormData>) => {
    set({ loading: true, error: null });
    try {
      const updated: Bank = await updateBankAPI(id, data);
      const banks = get().banks.map(b => {
        if (String(b.id) === String(updated.id)) return updated;
        if (data.isDefault) return { ...b, isDefault: false };
        return b;
      });
      set({ banks, defaultBank: computeDefaultBank(banks), loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to update bank.' });
      throw err;
    }
  },

  deleteBank: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteBankAPI(id);
      const banks = get().banks.filter(b => String(b.id) !== String(id));
      set({ banks, defaultBank: computeDefaultBank(banks), loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to delete bank.' });
      throw err;
    }
  },

  getBankById: (id: string) => {
    return get().banks.find(b => String(b.id) === String(id));
  },

  getActiveBanks: () => {
    return get().banks.filter(b => b.isActive);
  },

  getDefaultBank: () => {
    return computeDefaultBank(get().banks);
  },

  setDefaultBank: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updated: Bank = await setDefaultBankAPI(id);
      const banks = get().banks.map(b => ({
        ...b,
        isDefault: String(b.id) === String(updated.id),
      }));
      set({ banks, defaultBank: updated, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to set default bank.' });
      throw err;
    }
  },

  deposit: async (bankId: string, amount: number, description: string, referenceNumber?: string) => {
    set({ error: null });
    try {
      const result = await depositAPI(bankId, { amount, description, referenceNumber });
      const updatedBank: Bank = result.bank;
      const newTxn: BankTransaction = result.transaction;
      const banks = get().banks.map(b => String(b.id) === String(bankId) ? updatedBank : b);
      const txns = { ...get().transactions };
      txns[bankId] = [newTxn, ...(txns[bankId] || [])];
      set({ banks, defaultBank: computeDefaultBank(banks), transactions: txns });
    } catch (err: any) {
      set({ error: err.message || 'Deposit failed.' });
      throw err;
    }
  },

  withdraw: async (bankId: string, amount: number, description: string, referenceNumber?: string) => {
    set({ error: null });
    try {
      const result = await withdrawAPI(bankId, { amount, description, referenceNumber });
      const updatedBank: Bank = result.bank;
      const newTxn: BankTransaction = result.transaction;
      const banks = get().banks.map(b => String(b.id) === String(bankId) ? updatedBank : b);
      const txns = { ...get().transactions };
      txns[bankId] = [newTxn, ...(txns[bankId] || [])];
      set({ banks, defaultBank: computeDefaultBank(banks), transactions: txns });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Withdrawal failed.' });
      return false;
    }
  },

  transfer: async (data: TransferFormData) => {
    set({ error: null });
    try {
      const result = await transferAPI(data);
      const fromUpdated: Bank = result.fromBank;
      const toUpdated: Bank = result.toBank;
      const txns = result.transactions as BankTransaction[];

      const banks = get().banks.map(b => {
        if (String(b.id) === String(fromUpdated.id)) return fromUpdated;
        if (String(b.id) === String(toUpdated.id)) return toUpdated;
        return b;
      });

      const newTxnMap = { ...get().transactions };
      const fromId = String(data.fromBankId);
      const toId = String(data.toBankId);
      const outTxn = txns.find(t => t.type === 'transfer_out');
      const inTxn = txns.find(t => t.type === 'transfer_in');
      if (outTxn) newTxnMap[fromId] = [outTxn, ...(newTxnMap[fromId] || [])];
      if (inTxn) newTxnMap[toId] = [inTxn, ...(newTxnMap[toId] || [])];

      set({ banks, defaultBank: computeDefaultBank(banks), transactions: newTxnMap });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Transfer failed.' });
      return false;
    }
  },

  getTransactions: async (bankId: string) => {
    try {
      const txns: BankTransaction[] = await fetchBankTransactionsFromAPI(bankId);
      set(state => ({
        transactions: { ...state.transactions, [bankId]: txns },
      }));
      return txns;
    } catch (err: any) {
      return get().transactions[bankId] || [];
    }
  },

  getBankBalance: (bankId: string) => {
    const bank = get().banks.find(b => String(b.id) === String(bankId));
    return bank?.balance || 0;
  },

  getBankOptions: () => {
    return get()
      .banks
      .filter(b => b.isActive)
      .map(b => ({
        value: String(b.id),
        label: `${b.bankName} - ${b.accountNumber} (${b.accountHolderName})${b.isDefault ? ' (Default)' : ''}`,
      }));
  },
}));

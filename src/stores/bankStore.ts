import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bank, BankFormData, BankTransaction, TransactionType, TransferFormData } from '../modules/bank/types';

interface BankStore {
  banks: Bank[];
  defaultBank: Bank | null;
  transactions: BankTransaction[];
  
  // CRUD operations
  addBank: (data: BankFormData) => Bank;
  updateBank: (id: string, data: Partial<BankFormData>) => void;
  deleteBank: (id: string) => void;
  getBankById: (id: string) => Bank | undefined;
  getActiveBanks: () => Bank[];
  getDefaultBank: () => Bank | null;
  setDefaultBank: (id: string) => void;
  
  // Transaction operations
  deposit: (bankId: string, amount: number, description: string, referenceNumber?: string) => void;
  withdraw: (bankId: string, amount: number, description: string, referenceNumber?: string) => boolean;
  transfer: (data: TransferFormData) => boolean;
  getTransactions: (bankId?: string) => BankTransaction[];
  getBankBalance: (bankId: string) => number;
  
  // For use in other modules (sale, expense, purchase order)
  getBankOptions: () => { value: string; label: string }[];
}

const generateId = () => `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateTransactionId = () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useBankStore = create<BankStore>()(
  persist(
    (set, get) => ({
      banks: [],
      defaultBank: null,
      transactions: [],

      addBank: (data: BankFormData) => {
        const now = new Date().toISOString();
        const newBank: Bank = {
          id: generateId(),
          ...data,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const banks = [...state.banks, newBank];
          let defaultBank = state.defaultBank;
          if (banks.length === 1 || newBank.isDefault) {
            if (newBank.isDefault) {
              banks.forEach(b => {
                if (b.id !== newBank.id) b.isDefault = false;
              });
            }
            defaultBank = newBank.isDefault ? newBank : banks.find(b => b.isDefault) || null;
          }
          return { banks, defaultBank };
        });

        return newBank;
      },

      updateBank: (id: string, data: Partial<BankFormData>) => {
        set((state) => {
          const banks = state.banks.map((bank) => {
            if (bank.id === id) {
              const updated = { ...bank, ...data, updatedAt: new Date().toISOString() };
              return updated;
            }
            if (data.isDefault && bank.id !== id) {
              return { ...bank, isDefault: false, updatedAt: new Date().toISOString() };
            }
            return bank;
          });

          const updatedBank = banks.find(b => b.id === id);
          let defaultBank = state.defaultBank;
          
          if (updatedBank?.isDefault) {
            defaultBank = updatedBank;
          } else if (state.defaultBank?.id === id && !updatedBank?.isDefault) {
            defaultBank = banks.find(b => b.isDefault) || null;
          }

          return { banks, defaultBank };
        });
      },

      deleteBank: (id: string) => {
        set((state) => {
          const banks = state.banks.filter((bank) => bank.id !== id);
          let defaultBank = state.defaultBank;
          if (state.defaultBank?.id === id) {
            defaultBank = banks.find(b => b.isDefault) || banks[0] || null;
            if (defaultBank) {
              defaultBank.isDefault = true;
            }
          }
          return { banks, defaultBank };
        });
      },

      getBankById: (id: string) => {
        return get().banks.find((bank) => bank.id === id);
      },

      getActiveBanks: () => {
        return get().banks.filter((bank) => bank.isActive);
      },

      getDefaultBank: () => {
        const { banks, defaultBank } = get();
        if (defaultBank) return defaultBank;
        const activeDefault = banks.find(b => b.isDefault && b.isActive);
        if (activeDefault) return activeDefault;
        return banks.find(b => b.isActive) || null;
      },

      setDefaultBank: (id: string) => {
        set((state) => {
          const banks = state.banks.map((bank) => ({
            ...bank,
            isDefault: bank.id === id,
            updatedAt: bank.id === id ? new Date().toISOString() : bank.updatedAt,
          }));
          const defaultBank = banks.find(b => b.id === id) || null;
          return { banks, defaultBank };
        });
      },

      // Transaction operations
      deposit: (bankId: string, amount: number, description: string, referenceNumber?: string) => {
        if (amount <= 0) return;
        
        const transaction: BankTransaction = {
          id: generateTransactionId(),
          bankId,
          type: 'deposit',
          amount,
          description,
          referenceNumber,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          banks: state.banks.map((bank) =>
            bank.id === bankId
              ? { ...bank, balance: bank.balance + amount, updatedAt: new Date().toISOString() }
              : bank
          ),
          transactions: [transaction, ...state.transactions],
        }));
      },

      withdraw: (bankId: string, amount: number, description: string, referenceNumber?: string) => {
        if (amount <= 0) return false;
        
        const bank = get().banks.find((b) => b.id === bankId);
        if (!bank || bank.balance < amount) return false;

        const transaction: BankTransaction = {
          id: generateTransactionId(),
          bankId,
          type: 'withdrawal',
          amount,
          description,
          referenceNumber,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          banks: state.banks.map((b) =>
            b.id === bankId
              ? { ...b, balance: b.balance - amount, updatedAt: new Date().toISOString() }
              : b
          ),
          transactions: [transaction, ...state.transactions],
        }));

        return true;
      },

      transfer: (data: TransferFormData) => {
        const { fromBankId, toBankId, amount, description } = data;
        if (amount <= 0 || fromBankId === toBankId) return false;

        const fromBank = get().banks.find((b) => b.id === fromBankId);
        if (!fromBank || fromBank.balance < amount) return false;

        const now = new Date().toISOString();
        const baseTxnId = generateTransactionId();

        const outTransaction: BankTransaction = {
          id: `${baseTxnId}_out`,
          bankId: fromBankId,
          type: 'transfer_out',
          amount,
          description: `Transfer to ${get().banks.find(b => b.id === toBankId)?.bankName}: ${description}`,
          relatedBankId: toBankId,
          createdAt: now,
        };

        const inTransaction: BankTransaction = {
          id: `${baseTxnId}_in`,
          bankId: toBankId,
          type: 'transfer_in',
          amount,
          description: `Transfer from ${fromBank.bankName}: ${description}`,
          relatedBankId: fromBankId,
          createdAt: now,
        };

        set((state) => ({
          banks: state.banks.map((b) => {
            if (b.id === fromBankId) {
              return { ...b, balance: b.balance - amount, updatedAt: now };
            }
            if (b.id === toBankId) {
              return { ...b, balance: b.balance + amount, updatedAt: now };
            }
            return b;
          }),
          transactions: [outTransaction, inTransaction, ...state.transactions],
        }));

        return true;
      },

      getTransactions: (bankId?: string) => {
        const { transactions } = get();
        if (bankId) {
          return transactions.filter((t) => t.bankId === bankId);
        }
        return transactions;
      },

      getBankBalance: (bankId: string) => {
        const bank = get().banks.find((b) => b.id === bankId);
        return bank?.balance || 0;
      },

      getBankOptions: () => {
        return get()
          .banks
          .filter((bank) => bank.isActive)
          .map((bank) => ({
            value: bank.id,
            label: `${bank.bankName} - ${bank.accountNumber} (${bank.accountHolderName})${bank.isDefault ? ' (Default)' : ''}`,
          }));
      },
    }),
    {
      name: 'bank-store',
    }
  )
);

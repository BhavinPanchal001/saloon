export interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  branchName: string;
  branchAddress?: string;
  upiId?: string;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankFormData {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  branchName: string;
  branchAddress?: string;
  upiId?: string;
  isDefault: boolean;
  isActive: boolean;
}


export type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

export interface BankTransaction {
  id: string;
  bankId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceNumber?: string;
  relatedBankId?: string; // For transfers
  createdAt: string;
  createdBy?: string;
}

export interface TransferFormData {
  fromBankId: string;
  toBankId: string;
  amount: number;
  description: string;
}

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "debt_payment";
export interface Month {
  monthId: string;
  planName: string;
  netIncome: number;
  otherIncome: number;
  note: string;
}
export interface Wallet {
  walletId: string;
  name: string;
  type: "bank" | "cash" | "ewallet" | "saving";
  openingBalanceMinor: number;
  color: string;
  active: boolean;
}
export interface Category {
  categoryId: string;
  name: string;
  type: "expense" | "saving" | "income";
}
export interface Budget {
  budgetId: string;
  monthId: string;
  categoryId: string;
  amountMinor: number;
}
export interface DebtAccount {
  debtId: string;
  name: string;
  principalMinor: number;
  active: boolean;
  note: string;
}
export interface DebtInstallment {
  installmentId: string;
  debtId: string;
  monthId: string;
  amountDueMinor: number;
  dueDate: string;
  installmentNo: number;
}
export interface Transaction {
  transactionId: string;
  txDate: string;
  monthId: string;
  type: TransactionType;
  amountMinor: number;
  fromWalletId?: string;
  toWalletId?: string;
  categoryId?: string;
  installmentId?: string;
  note?: string;
  status: "posted" | "void";
}
export interface Receipt {
  receiptId: string;
  transactionId: string;
  blobId: string;
  fileName: string;
  createdAt: string;
}
export interface Data {
  version: 2;
  months: Month[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  debts: DebtAccount[];
  installments: DebtInstallment[];
  transactions: Transaction[];
  receipts: Receipt[];
}

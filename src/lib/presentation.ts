import type { TransactionType } from "../models";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Landmark,
  Banknote,
  Wallet as WalletIcon,
  PiggyBank,
} from "lucide-react";
export const labels: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  transfer: "โอนเงิน",
  debt_payment: "จ่ายหนี้",
};
export const icons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  debt_payment: CreditCard,
};
export const walletTypes = {
  bank: "บัญชีธนาคาร",
  cash: "เงินสด",
  ewallet: "อีวอลเล็ต",
  saving: "เงินออม",
};
export const walletIcons = {
  bank: Landmark,
  cash: Banknote,
  ewallet: WalletIcon,
  saving: PiggyBank,
};
export const failure = (error: unknown) =>
  error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";

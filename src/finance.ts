import type { Data, Transaction, Wallet } from "./models";
export const id = () => crypto.randomUUID();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const money = (minor: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(minor / 100);
export function parseMoney(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("กรอกจำนวนเงินไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 100_000_000_000)
    throw new Error("จำนวนเงินสูงเกินขอบเขตที่รองรับ");
  return amount;
}
export function walletBalance(data: Data, wallet: Wallet) {
  return data.transactions
    .filter((t) => t.status === "posted")
    .reduce(
      (sum, t) =>
        sum +
        (t.toWalletId === wallet.walletId ? t.amountMinor : 0) -
        (t.fromWalletId === wallet.walletId ? t.amountMinor : 0),
      wallet.openingBalanceMinor,
    );
}
export const actualForMonth = (data: Data, month: string) =>
  data.transactions
    .filter((t) => t.monthId === month && t.status === "posted")
    .sort((a, b) => b.txDate.localeCompare(a.txDate));
export const paidFor = (data: Data, installmentId: string) =>
  data.transactions
    .filter(
      (t) =>
        t.status === "posted" &&
        t.type === "debt_payment" &&
        t.installmentId === installmentId,
    )
    .reduce((s, t) => s + t.amountMinor, 0);
export const outstandingFor = (data: Data, installmentId: string) =>
  Math.max(
    0,
    (data.installments.find((i) => i.installmentId === installmentId)
      ?.amountDueMinor ?? 0) - paidFor(data, installmentId),
  );
export function installmentStatus(
  data: Data,
  installmentId: string,
): "unpaid" | "partial" | "paid" {
  return outstandingFor(data, installmentId) === 0
    ? "paid"
    : paidFor(data, installmentId) > 0
      ? "partial"
      : "unpaid";
}
export function planFor(data: Data, month: string) {
  const m = data.months.find((m) => m.monthId === month);
  const income = (m?.netIncome ?? 0) + (m?.otherIncome ?? 0);
  const budgets = data.budgets.filter((b) => b.monthId === month);
  const savings = budgets
    .filter(
      (b) =>
        data.categories.find((c) => c.categoryId === b.categoryId)?.type ===
        "saving",
    )
    .reduce((s, b) => s + b.amountMinor, 0);
  const expenses = budgets
    .filter(
      (b) =>
        data.categories.find((c) => c.categoryId === b.categoryId)?.type ===
        "expense",
    )
    .reduce((s, b) => s + b.amountMinor, 0);
  const debt = data.installments
    .filter((i) => i.monthId === month)
    .reduce((s, i) => s + i.amountDueMinor, 0);
  return {
    income,
    expenses,
    savings,
    debt,
    remaining: income - expenses - savings - debt,
  };
}
export function allocation(plan: ReturnType<typeof planFor>) {
  const amounts = [
    plan.savings,
    plan.expenses,
    plan.debt,
    Math.max(0, plan.remaining),
  ];
  const denominator = Math.max(
    plan.income,
    amounts.reduce((s, a) => s + a, 0),
  );
  return amounts.map((a) => (denominator > 0 ? (a / denominator) * 100 : 0));
}
export function validateTransaction(data: Data, tx: Transaction) {
  if (
    !Number.isSafeInteger(tx.amountMinor) ||
    tx.amountMinor <= 0 ||
    tx.amountMinor > 100_000_000_000
  )
    throw new Error("จำนวนเงินต้องมากกว่า 0 และอยู่ในขอบเขตที่รองรับ");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(tx.txDate) ||
    !Number.isFinite(Date.parse(tx.txDate)) ||
    new Date(tx.txDate).toISOString().slice(0, 10) !== tx.txDate ||
    tx.monthId !== tx.txDate.slice(0, 7)
  )
    throw new Error("วันที่ไม่ถูกต้อง");
  const hasWallet = (value?: string) =>
    data.wallets.some((w) => w.walletId === value && w.active);
  if (tx.type === "income" && (!hasWallet(tx.toWalletId) || tx.fromWalletId))
    throw new Error("เลือกกระเป๋ารับเงิน");
  if (tx.type !== "income" && !hasWallet(tx.fromWalletId))
    throw new Error("เลือกกระเป๋าต้นทาง");
  if (
    tx.type === "transfer" &&
    (!hasWallet(tx.toWalletId) || tx.toWalletId === tx.fromWalletId)
  )
    throw new Error("กระเป๋าต้นทางและปลายทางต้องต่างกัน");
  if (tx.type !== "income" && tx.type !== "transfer" && tx.toWalletId)
    throw new Error("ประเภทรายการไม่รองรับกระเป๋าปลายทาง");
  if (
    (tx.type === "income" || tx.type === "expense") &&
    !data.categories.some(
      (c) => c.categoryId === tx.categoryId && c.type === tx.type,
    )
  )
    throw new Error("เลือกหมวดให้ตรงประเภทรายการ");
  if (tx.type === "debt_payment") {
    const installment = data.installments.find(
      (i) => i.installmentId === tx.installmentId,
    );
    if (
      !installment ||
      !data.debts.some((d) => d.debtId === installment.debtId && d.active)
    )
      throw new Error("เลือกงวดหนี้");
    if (tx.amountMinor > outstandingFor(data, installment.installmentId))
      throw new Error("ยอดชำระเกินยอดค้างของงวด");
  }
}
export function addTransaction(data: Data, tx: Transaction): Data {
  if (data.transactions.some((t) => t.transactionId === tx.transactionId))
    return data;
  validateTransaction(data, tx);
  return { ...data, transactions: [tx, ...data.transactions] };
}

import type { Data } from "./models";
import { today } from "./finance";
export function createSeed(): Data {
  const date = today(),
    month = date.slice(0, 7);
  return {
    version: 2,
    months: [
      {
        monthId: month,
        planName: "แผนตัวอย่าง",
        netIncome: 4500000,
        otherIncome: 500000,
        note: "",
      },
    ],
    wallets: [
      {
        walletId: "bank",
        name: "บัญชีใช้จ่าย",
        type: "bank",
        openingBalanceMinor: 2540000,
        color: "#38BDF8",
        active: true,
      },
      {
        walletId: "cash",
        name: "เงินสด",
        type: "cash",
        openingBalanceMinor: 300000,
        color: "#F59E0B",
        active: true,
      },
      {
        walletId: "saving",
        name: "เงินออมเพื่ออนาคต",
        type: "saving",
        openingBalanceMinor: 8000000,
        color: "#22C55E",
        active: true,
      },
    ],
    categories: [
      { categoryId: "food", name: "อาหารและเครื่องดื่ม", type: "expense" },
      { categoryId: "living", name: "ค่าใช้จ่ายประจำ", type: "expense" },
      { categoryId: "travel", name: "เดินทาง", type: "expense" },
      { categoryId: "save", name: "เงินเก็บ", type: "saving" },
      { categoryId: "salary", name: "เงินเดือน", type: "income" },
      { categoryId: "extra", name: "รายได้อื่น", type: "income" },
    ],
    budgets: [
      {
        budgetId: "food-budget",
        monthId: month,
        categoryId: "food",
        amountMinor: 800000,
      },
      {
        budgetId: "living-budget",
        monthId: month,
        categoryId: "living",
        amountMinor: 1200000,
      },
      {
        budgetId: "travel-budget",
        monthId: month,
        categoryId: "travel",
        amountMinor: 200000,
      },
      {
        budgetId: "saving-budget",
        monthId: month,
        categoryId: "save",
        amountMinor: 1000000,
      },
    ],
    debts: [
      {
        debtId: "car",
        name: "สินเชื่อรถยนต์",
        principalMinor: 12000000,
        active: true,
        note: "ข้อมูลตัวอย่าง ไม่มีดอกเบี้ยเพิ่มเติม",
      },
    ],
    installments: Array.from({ length: 12 }, (_, index) => {
      const d = new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)) - 1 + index,
        25,
      );
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        installmentId: `car-${index}`,
        debtId: "car",
        monthId: m,
        amountDueMinor: 1000000,
        dueDate: `${m}-25`,
        installmentNo: index + 1,
      };
    }),
    transactions: [
      {
        transactionId: "seed-income",
        type: "income",
        txDate: date,
        monthId: month,
        amountMinor: 4500000,
        toWalletId: "bank",
        categoryId: "salary",
        note: "เงินเดือน · ตัวอย่าง",
        status: "posted",
      },
      {
        transactionId: "seed-food",
        type: "expense",
        txDate: date,
        monthId: month,
        amountMinor: 18500,
        fromWalletId: "cash",
        categoryId: "food",
        note: "มื้อกลางวัน · ตัวอย่าง",
        status: "posted",
      },
      {
        transactionId: "seed-transfer",
        type: "transfer",
        txDate: date,
        monthId: month,
        amountMinor: 500000,
        fromWalletId: "bank",
        toWalletId: "saving",
        note: "ออมเงิน · ตัวอย่าง",
        status: "posted",
      },
      {
        transactionId: "seed-debt",
        type: "debt_payment",
        txDate: date,
        monthId: month,
        amountMinor: 400000,
        fromWalletId: "bank",
        installmentId: "car-0",
        note: "ชำระบางส่วน · ตัวอย่าง",
        status: "posted",
      },
    ],
    receipts: [],
  };
}

import { describe, expect, it } from "vitest";
import {
  actualForMonth,
  addTransaction,
  allocation,
  installmentStatus,
  outstandingFor,
  parseMoney,
  planFor,
  walletBalance,
} from "../src/finance";
import { createSeed } from "../src/seed";
import type { Data, Transaction } from "../src/models";
const fixture = (): Data => ({ ...createSeed(), transactions: [] });
const tx = (overrides: Partial<Transaction>): Transaction => ({
  transactionId: "tx",
  txDate: "2026-10-01",
  monthId: "2026-10",
  type: "expense",
  amountMinor: 10001,
  fromWalletId: "bank",
  categoryId: "food",
  status: "posted",
  ...overrides,
});
const total = (d: Data) =>
  d.wallets.reduce((s, w) => s + walletBalance(d, w), 0);
describe("financial ledger", () => {
  it("income and expense affect the intended wallet in integer satang", () => {
    let d = fixture();
    const opening = walletBalance(d, d.wallets[0]);
    d = addTransaction(
      d,
      tx({
        type: "income",
        fromWalletId: undefined,
        toWalletId: "bank",
        categoryId: "salary",
        amountMinor: parseMoney("0.20"),
      }),
    );
    d = addTransaction(
      d,
      tx({ transactionId: "expense", amountMinor: parseMoney("0.10") }),
    );
    expect(walletBalance(d, d.wallets[0])).toBe(opening + 10);
  });
  it("transfer conserves combined balances", () => {
    const d = fixture();
    const next = addTransaction(
      d,
      tx({ type: "transfer", toWalletId: "saving", categoryId: undefined }),
    );
    expect(total(next)).toBe(total(d));
    expect(walletBalance(next, next.wallets[0])).toBe(
      walletBalance(d, d.wallets[0]) - 10001,
    );
    expect(walletBalance(next, next.wallets[2])).toBe(
      walletBalance(d, d.wallets[2]) + 10001,
    );
  });
  it("partial debt payment deducts only once and derives installment state", () => {
    const d = fixture(),
      i = d.installments[0];
    const next = addTransaction(
      d,
      tx({
        type: "debt_payment",
        installmentId: i.installmentId,
        amountMinor: 400000,
        categoryId: undefined,
      }),
    );
    expect(total(next)).toBe(total(d) - 400000);
    expect(outstandingFor(next, i.installmentId)).toBe(600000);
    expect(installmentStatus(next, i.installmentId)).toBe("partial");
    const full = addTransaction(
      next,
      tx({
        transactionId: "second",
        type: "debt_payment",
        installmentId: i.installmentId,
        amountMinor: 600000,
      }),
    );
    expect(installmentStatus(full, i.installmentId)).toBe("paid");
    expect(() =>
      addTransaction(
        full,
        tx({
          transactionId: "over",
          type: "debt_payment",
          installmentId: i.installmentId,
        }),
      ),
    ).toThrow("เกิน");
  });
  it("planned savings do not deduct actual funds", () => {
    const d = fixture(),
      before = total(d);
    expect(planFor(d, d.months[0].monthId).savings).toBe(1000000);
    d.budgets[3].amountMinor = 5000000;
    expect(total(d)).toBe(before);
  });
  it("month filter leaves wallet balances cumulative", () => {
    let d = fixture();
    d = addTransaction(d, tx({}));
    d = addTransaction(
      d,
      tx({ transactionId: "nov", txDate: "2026-11-01", monthId: "2026-11" }),
    );
    expect(actualForMonth(d, "2026-10")).toHaveLength(1);
    expect(actualForMonth(d, "2026-11")).toHaveLength(1);
    expect(walletBalance(d, d.wallets[0])).toBe(
      d.wallets[0].openingBalanceMinor - 20002,
    );
  });
  it("void entries are excluded from actual ledger and debt totals", () => {
    let d = fixture();
    const i = d.installments[0];
    d = {
      ...d,
      transactions: [
        tx({ status: "void" }),
        tx({
          transactionId: "debt",
          status: "void",
          type: "debt_payment",
          installmentId: i.installmentId,
        }),
      ],
    };
    expect(total(d)).toBe(total(fixture()));
    expect(actualForMonth(d, "2026-10")).toHaveLength(0);
    expect(installmentStatus(d, i.installmentId)).toBe("unpaid");
  });
  it("deduplicates the same operation ID", () => {
    const d = addTransaction(fixture(), tx({}));
    expect(addTransaction(d, tx({}))).toBe(d);
    expect(d.transactions).toHaveLength(1);
  });
  it("validates amounts, dates, categories and same wallet transfers", () => {
    expect(parseMoney("12.34")).toBe(1234);
    expect(parseMoney("0.01")).toBe(1);
    for (const v of ["1.001", "-1", "NaN", "1e5", "9007199254740992"])
      expect(() => parseMoney(v)).toThrow();
    for (const overrides of [
      { amountMinor: 0 },
      { amountMinor: 0.1 },
      { txDate: "2026-02-30", monthId: "2026-02" },
      { categoryId: "save" },
      { type: "transfer" as const, toWalletId: "bank" },
      { fromWalletId: "missing" },
    ])
      expect(() => addTransaction(fixture(), tx(overrides))).toThrow();
  });
  it("allocation remains within 100% even over budget or with no income", () => {
    for (const income of [0, 100, 5000000]) {
      const p = {
        income,
        savings: 100,
        expenses: 200,
        debt: 300,
        remaining: income - 600,
      };
      const bar = allocation(p);
      expect(bar.every((n) => n >= 0 && Number.isFinite(n))).toBe(true);
      expect(bar.reduce((s, n) => s + n, 0)).toBeCloseTo(100);
    }
    expect(
      allocation({ income: 0, savings: 0, expenses: 0, debt: 0, remaining: 0 }),
    ).toEqual([0, 0, 0, 0]);
  });
});

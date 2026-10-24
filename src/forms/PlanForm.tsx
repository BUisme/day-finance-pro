import { useState, useRef, type FormEvent } from "react";
import { Check } from "lucide-react";
import type {
  Data,
  Transaction,
  TransactionType,
  Wallet,
  DebtAccount,
  DebtInstallment,
} from "../models";
import {
  id,
  today,
  parseMoney,
  walletBalance,
  money,
  outstandingFor,
  paidFor,
} from "../finance";
import { persistTransaction } from "../storage";
import { Field, ErrorText } from "../components/ui";
import { labels, walletTypes, failure } from "../lib/presentation";
export function PlanForm({
  data,
  month,
  onSave,
}: {
  data: Data;
  month: string;
  onSave: (data: Data) => void;
}) {
  const [error, setError] = useState("");
  const existing = data.months.find((m) => m.monthId === month);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget),
            m = {
              monthId: month,
              planName: "แผนรายเดือน",
              netIncome: parseMoney(String(f.get("netIncome"))),
              otherIncome: parseMoney(String(f.get("otherIncome"))),
              note: "",
            };
          const budgets = data.categories
            .filter((c) => c.type !== "income")
            .map((c) => ({
              budgetId:
                data.budgets.find(
                  (b) => b.monthId === month && b.categoryId === c.categoryId,
                )?.budgetId ?? id(),
              monthId: month,
              categoryId: c.categoryId,
              amountMinor: parseMoney(String(f.get(c.categoryId))),
            }));
          onSave({
            ...data,
            months: [...data.months.filter((m) => m.monthId !== month), m],
            budgets: [
              ...data.budgets.filter((b) => b.monthId !== month),
              ...budgets,
            ],
          });
        } catch (e) {
          setError(failure(e));
        }
      }}
    >
      <p className="footnote">แก้ไขเฉพาะแผน ไม่กระทบยอดเงินจริงในกระเป๋า</p>
      <Field label="รายรับสุทธิตามแผน (บาท)">
        <input
          name="netIncome"
          inputMode="decimal"
          defaultValue={(existing?.netIncome ?? 0) / 100}
          required
        />
      </Field>
      <Field label="รายรับอื่นตามแผน (บาท)">
        <input
          name="otherIncome"
          inputMode="decimal"
          defaultValue={(existing?.otherIncome ?? 0) / 100}
          required
        />
      </Field>
      {data.categories
        .filter((c) => c.type !== "income")
        .map((c) => (
          <Field key={c.categoryId} label={`${c.name}ตามแผน (บาท)`}>
            <input
              name={c.categoryId}
              inputMode="decimal"
              defaultValue={
                (data.budgets.find(
                  (b) => b.monthId === month && b.categoryId === c.categoryId,
                )?.amountMinor ?? 0) / 100
              }
              required
            />
          </Field>
        ))}
      <p className="footnote">หนี้ตามแผนคำนวณจากตารางงวดในหน้าหนี้</p>
      <ErrorText text={error} />
      <button className="primary">บันทึกแผน</button>
    </form>
  );
}

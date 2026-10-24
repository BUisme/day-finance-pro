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
export function DebtForm({
  data,
  debt,
  onSave,
}: {
  data: Data;
  debt?: DebtAccount;
  onSave: (debt: DebtAccount, installments: DebtInstallment[]) => void;
}) {
  const existing = data.installments
    .filter((i) => i.debtId === debt?.debtId)
    .sort((a, b) => a.installmentNo - b.installmentNo);
  const [rows, setRows] = useState(
      existing.map((i) => ({ ...i, amount: String(i.amountDueMinor / 100) })),
    ),
    [error, setError] = useState("");
  const [count, setCount] = useState(existing.length || 12),
    [fixed, setFixed] = useState("1000"),
    [start, setStart] = useState(today());
  const hasPaid = existing.some((i) => paidFor(data, i.installmentId) > 0);
  const debtId = useRef(debt?.debtId ?? id());
  const generate = () => {
    try {
      if (!Number.isInteger(count) || count < 1 || count > 120)
        throw new Error("จำนวนงวดต้องเป็น 1–120");
      const amount = parseMoney(fixed);
      if (amount <= 0) throw new Error("ยอดต่องวดต้องมากกว่า 0");
      if (!start) throw new Error("เลือกวันครบกำหนดงวดแรก");
      const [year, month, day] = start.split("-").map(Number);
      setRows(
        Array.from({ length: count }, (_, n) => {
          const last = new Date(year, month + n, 0).getDate();
          const date = new Date(year, month - 1 + n, Math.min(day, last));
          const dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          return {
            installmentId: id(),
            debtId: debtId.current,
            monthId: dueDate.slice(0, 7),
            dueDate,
            installmentNo: n + 1,
            amountDueMinor: amount,
            amount: String(amount / 100),
          };
        }),
      );
      setError("");
    } catch (e) {
      setError(failure(e));
    }
  };
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget),
            name = String(f.get("name")).trim();
          if (!name) throw new Error("ระบุชื่อหนี้");
          if (!rows.length) throw new Error("สร้างตารางงวดก่อนบันทึก");
          const installments = rows.map(({ amount, ...i }) => {
            const minor = parseMoney(amount);
            if (minor <= 0 || minor < paidFor(data, i.installmentId))
              throw new Error(
                "ยอดงวดต้องมากกว่า 0 และไม่น้อยกว่ายอดที่ชำระแล้ว",
              );
            if (!i.dueDate || !Number.isFinite(Date.parse(i.dueDate)))
              throw new Error("ระบุวันครบกำหนดให้ครบ");
            return {
              ...i,
              monthId: i.dueDate.slice(0, 7),
              amountDueMinor: minor,
            };
          });
          const principal = installments.reduce(
            (s, i) => s + i.amountDueMinor,
            0,
          );
          onSave(
            {
              debtId: debtId.current,
              name,
              principalMinor: principal,
              active: true,
              note: String(f.get("note") ?? ""),
            },
            installments,
          );
        } catch (e) {
          setError(failure(e));
        }
      }}
    >
      <Field label="ชื่อหนี้">
        <input name="name" defaultValue={debt?.name} required maxLength={80} />
      </Field>
      <Field label="หมายเหตุ">
        <input name="note" defaultValue={debt?.note} maxLength={300} />
      </Field>
      <div className="schedule-builder">
        <h3>สร้างตารางยอดคงที่</h3>
        {hasPaid ? (
          <p className="footnote">
            มีการชำระแล้ว: ปรับยอด/วันในแต่ละงวดได้ โดยคง ID งวดเดิม
          </p>
        ) : (
          <>
            <div className="two-col">
              <Field label="จำนวนงวด">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </Field>
              <Field label="ยอดต่องวด (บาท)">
                <input
                  inputMode="decimal"
                  value={fixed}
                  onChange={(e) => setFixed(e.target.value)}
                />
              </Field>
            </div>
            <Field label="ครบกำหนดงวดแรก">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <button type="button" className="secondary full" onClick={generate}>
              สร้าง / แทนที่ตารางงวด
            </button>
          </>
        )}
      </div>
      {rows.length > 0 && (
        <>
          <h3>กำหนดแต่ละงวด</h3>
          <p className="footnote">
            ยอดหนี้ตั้งต้น = ผลรวมยอดทุกงวด ไม่มีการคำนวณดอกเบี้ย
          </p>
          <div className="schedule-editor">
            {rows.map((row, index) => (
              <div className="schedule-edit-row" key={row.installmentId}>
                <span>#{index + 1}</span>
                <input
                  aria-label={`วันครบกำหนดงวด ${index + 1}`}
                  type="date"
                  required
                  value={row.dueDate}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, n) =>
                        n === index ? { ...r, dueDate: e.target.value } : r,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`ยอดงวด ${index + 1}`}
                  inputMode="decimal"
                  required
                  value={row.amount}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, n) =>
                        n === index ? { ...r, amount: e.target.value } : r,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p>
            ยอดรวม{" "}
            {(() => {
              try {
                return money(
                  rows.reduce((s, r) => s + parseMoney(r.amount), 0),
                );
              } catch {
                return "—";
              }
            })()}
          </p>
        </>
      )}
      <ErrorText text={error} />
      <button className="primary">บันทึกหนี้และตารางงวด</button>
    </form>
  );
}

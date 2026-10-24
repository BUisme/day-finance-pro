import { useState, useRef, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { Data, Transaction, TransactionType } from "../models";
import {
  id,
  today,
  parseMoney,
  walletBalance,
  money,
  outstandingFor,
} from "../finance";
import { persistTransaction } from "../storage";
import { Field, ErrorText } from "../components/ui";
import { labels, failure } from "../lib/presentation";
export function TransactionForm({
  data,
  stale,
  onSave,
}: {
  data: Data;
  stale: boolean;
  onSave: (data: Data) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    txId = useRef(id());
  const [source, setSource] = useState(data.wallets[0]?.walletId ?? "");
  const [target, setTarget] = useState(
    data.wallets[1]?.walletId ?? data.wallets[0]?.walletId ?? "",
  );
  const [amount, setAmount] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (stale) throw new Error("ข้อมูลเปลี่ยนจากแท็บอื่น กรุณาโหลดใหม่");
      const form = new FormData(e.currentTarget);
      const date = String(form.get("date"));
      const tx: Transaction = {
        transactionId: txId.current,
        txDate: date,
        monthId: date.slice(0, 7),
        type,
        amountMinor: parseMoney(amount),
        status: "posted",
        note: String(form.get("note") ?? "").trim(),
        ...(type === "income"
          ? { toWalletId: source }
          : { fromWalletId: source }),
        ...(type === "transfer" ? { toWalletId: target } : {}),
        ...(["income", "expense"].includes(type)
          ? { categoryId: String(form.get("category")) }
          : {}),
        ...(type === "debt_payment"
          ? { installmentId: String(form.get("installment")) }
          : {}),
      };
      const file = form.get("receipt") as File | null;
      onSave(await persistTransaction(data, tx, file?.size ? file : undefined));
    } catch (e) {
      setError(failure(e));
      lock.current = false;
      setBusy(false);
    }
  };
  const projected = (() => {
    try {
      return (
        walletBalance(data, data.wallets.find((w) => w.walletId === source)!) -
        (type === "income" ? 0 : parseMoney(amount))
      );
    } catch {
      return 0;
    }
  })();
  return (
    <form onSubmit={submit} className="form">
      <div className="type-picker">
        {Object.entries(labels).map(([key, label]) => (
          <button
            type="button"
            key={key}
            disabled={busy}
            className={type === key ? `selected ${key}` : ""}
            onClick={() => {
              setType(key as TransactionType);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Field label="จำนวนเงิน (บาท)">
        <input
          autoComplete="off"
          className="amount-input"
          inputMode="decimal"
          placeholder="0.00"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </Field>
      <Field label="วันที่ทำรายการ">
        <input
          name="date"
          type="date"
          defaultValue={today()}
          required
          disabled={busy}
        />
      </Field>
      <Field label={type === "income" ? "กระเป๋ารับเงิน" : "กระเป๋าต้นทาง"}>
        <select
          aria-label={type === "income" ? "กระเป๋ารับเงิน" : "กระเป๋าต้นทาง"}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
          disabled={busy}
        >
          {data.wallets
            .filter((w) => w.active)
            .map((w) => (
              <option key={w.walletId} value={w.walletId}>
                {w.name} · {money(walletBalance(data, w))}
              </option>
            ))}
        </select>
      </Field>
      {type === "transfer" && (
        <Field label="กระเป๋าปลายทาง">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            disabled={busy}
          >
            {data.wallets
              .filter((w) => w.active)
              .map((w) => (
                <option key={w.walletId} value={w.walletId}>
                  {w.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      {["income", "expense"].includes(type) && (
        <Field label="หมวดหมู่">
          <select key={type} name="category" required disabled={busy}>
            {data.categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option value={c.categoryId} key={c.categoryId}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      {type === "debt_payment" && (
        <Field label="หนี้ / งวดที่ชำระ">
          <select name="installment" required disabled={busy}>
            <option value="">เลือกงวดที่ยังมียอดค้าง</option>
            {data.installments
              .filter((i) => outstandingFor(data, i.installmentId) > 0)
              .map((i) => (
                <option key={i.installmentId} value={i.installmentId}>
                  {data.debts.find((d) => d.debtId === i.debtId)?.name} · #
                  {i.installmentNo} · {i.dueDate} · ค้าง{" "}
                  {money(outstandingFor(data, i.installmentId))}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="รายละเอียด (ไม่บังคับ)">
        <textarea
          name="note"
          placeholder="บันทึกเรื่องเล็ก ๆ ของรายการนี้"
          maxLength={500}
          rows={2}
          disabled={busy}
        />
      </Field>
      <Field label="แนบสลิป (JPG, PNG, WebP ไม่เกิน 5 MB)">
        <input
          name="receipt"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
        />
      </Field>
      {projected < 0 && (
        <p className="warning">
          ยอดกระเป๋าหลังบันทึกจะติดลบ ({money(projected)})
          ระบบอนุญาตให้บันทึกได้
        </p>
      )}
      <ErrorText text={error} />
      <button className="primary" disabled={busy || stale} type="submit">
        {busy ? (
          "กำลังบันทึก…"
        ) : (
          <>
            <Check size={18} />
            บันทึกรายการ
          </>
        )}
      </button>
      <p className="footnote">
        บันทึกเฉพาะในอุปกรณ์นี้ ไม่มีการเคลื่อนย้ายเงินจริง
      </p>
    </form>
  );
}

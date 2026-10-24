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
export function WalletForm({
  wallet,
  onSave,
}: {
  wallet?: Wallet;
  onSave: (wallet: Wallet) => void;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget);
          const name = String(f.get("name")).trim();
          if (!name) throw new Error("ระบุชื่อกระเป๋า");
          onSave({
            walletId: wallet?.walletId ?? id(),
            name,
            type: String(f.get("type")) as Wallet["type"],
            openingBalanceMinor: parseMoney(String(f.get("opening"))),
            color: String(f.get("color")),
            active: true,
          });
        } catch (e) {
          setError(failure(e));
        }
      }}
    >
      <Field label="ชื่อกระเป๋า">
        <input
          name="name"
          defaultValue={wallet?.name}
          required
          maxLength={60}
        />
      </Field>
      <Field label="ประเภท">
        <select name="type" defaultValue={wallet?.type ?? "bank"}>
          {Object.entries(walletTypes).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="ยอดตั้งต้น (บาท)">
        <input
          name="opening"
          defaultValue={wallet ? String(wallet.openingBalanceMinor / 100) : "0"}
          inputMode="decimal"
          required
        />
      </Field>
      <p className="footnote">
        ยอดตั้งต้นก่อนรายการทั้งหมด การแก้ไขจะเปลี่ยนฐานยอดบัญชีทุกเดือน
      </p>
      <Field label="สีประจำกระเป๋า">
        <input
          name="color"
          type="color"
          defaultValue={wallet?.color ?? "#38bdf8"}
        />
      </Field>
      <ErrorText text={error} />
      <button className="primary">บันทึกกระเป๋า</button>
    </form>
  );
}

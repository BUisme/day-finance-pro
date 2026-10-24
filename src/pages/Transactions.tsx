import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Data, Transaction } from "../models";
import { actualForMonth } from "../finance";
import { TxRows } from "../components/ui";
import { labels } from "../lib/presentation";
export function Transactions({
  data,
  month,
  walletId,
  onClear,
  onReceipt,
}: {
  data: Data;
  month: string;
  walletId?: string;
  onClear: () => void;
  onReceipt: (t: Transaction) => void;
}) {
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all");
  const rows = actualForMonth(data, month).filter(
    (tx) =>
      (type === "all" || type === tx.type) &&
      (!walletId ||
        tx.fromWalletId === walletId ||
        tx.toWalletId === walletId) &&
      [
        tx.note,
        labels[tx.type],
        data.categories.find((c) => c.categoryId === tx.categoryId)?.name,
        ...data.wallets
          .filter(
            (w) =>
              w.walletId === tx.fromWalletId || w.walletId === tx.toWalletId,
          )
          .map((w) => w.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCIAL JOURNAL</p>
          <h2>รายการจริง.</h2>
        </div>
        <span className="badge">{rows.length} รายการ</span>
      </div>
      {walletId && (
        <div className="section-head">
          <p>
            กระเป๋า: {data.wallets.find((w) => w.walletId === walletId)?.name}
          </p>
          <button className="text-button" onClick={onClear}>
            ทุกกระเป๋า <X size={15} />
          </button>
        </div>
      )}
      <label className="search">
        <Search size={19} />
        <input
          aria-label="ค้นหารายการ"
          placeholder="ค้นหาหมวด กระเป๋า หรือรายละเอียด"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="filter-tabs" aria-label="กรองประเภท">
        {[["all", "ทั้งหมด"], ...Object.entries(labels)].map(([key, label]) => (
          <button
            key={key}
            className={type === key ? "active" : ""}
            onClick={() => setType(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        <TxRows data={data} transactions={rows} onReceipt={onReceipt} />
      </section>
      <p className="footnote">
        รายการจริงเดือน {month} · การโอนไม่ใช่รายรับหรือรายจ่าย
      </p>
    </>
  );
}

import {
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";
import { X, ReceiptText } from "lucide-react";
import type { Data, Transaction } from "../models";
import { money } from "../finance";
import { labels, icons } from "../lib/presentation";
export function Amount({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return <span className={`amount ${className}`}>{money(value)}</span>;
}
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href],[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="handle" />
        <div className="section-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="ปิด" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{ "aria-labelledby"?: string }>,
            { "aria-labelledby": labelId },
          )
        : children}
    </label>
  );
}
export function ErrorText({ text }: { text: string }) {
  return text ? (
    <p className="error" role="alert">
      {text}
    </p>
  ) : null;
}
export function TxRows({
  data,
  transactions,
  onReceipt,
}: {
  data: Data;
  transactions: Transaction[];
  onReceipt: (tx: Transaction) => void;
}) {
  return (
    <div className="tx-list">
      {transactions.length === 0 ? (
        <div className="empty">
          <ReceiptText />
          <p>ยังไม่มีรายการในช่วงนี้</p>
          <small>เพิ่มรายการแรกด้วยปุ่ม + ด้านล่าง</small>
        </div>
      ) : (
        transactions.map((tx) => {
          const Icon = icons[tx.type];
          const category = data.categories.find(
            (c) => c.categoryId === tx.categoryId,
          )?.name;
          const from = data.wallets.find(
            (w) => w.walletId === tx.fromWalletId,
          )?.name;
          const to = data.wallets.find(
            (w) => w.walletId === tx.toWalletId,
          )?.name;
          return (
            <article className="tx-row" key={tx.transactionId}>
              <div className={`tx-icon ${tx.type}`}>
                <Icon size={20} />
              </div>
              <div className="tx-info">
                <strong>
                  {category ?? labels[tx.type]}
                  {tx.status === "void" ? " · ยกเลิก" : ""}
                </strong>
                <small>
                  {tx.txDate} · {from}
                  {from && to ? " → " : ""}
                  {to}
                </small>
                {tx.note && <small>{tx.note}</small>}
                {data.receipts.some(
                  (r) => r.transactionId === tx.transactionId,
                ) && (
                  <button className="text-button" onClick={() => onReceipt(tx)}>
                    ดูสลิป
                  </button>
                )}
              </div>
              <Amount
                className={tx.type}
                value={
                  tx.type === "expense" || tx.type === "debt_payment"
                    ? -tx.amountMinor
                    : tx.amountMinor
                }
              />
            </article>
          );
        })
      )}
    </div>
  );
}

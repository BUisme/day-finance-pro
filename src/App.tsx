import {
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet as WalletIcon,
  LayoutDashboard,
  CreditCard,
  List,
  Plus,
  X,
  ChevronRight,
  Pencil,
  Search,
  ShieldCheck,
  PiggyBank,
  Landmark,
  Banknote,
  ReceiptText,
  Check,
  TrendingUp,
} from "lucide-react";
import type {
  Data,
  DebtAccount,
  DebtInstallment,
  Transaction,
  TransactionType,
  Wallet,
} from "./models";
import {
  actualForMonth,
  allocation,
  id,
  installmentStatus,
  money,
  outstandingFor,
  paidFor,
  parseMoney,
  planFor,
  today,
  walletBalance,
} from "./finance";
import { getReceipt, loadData, persistTransaction, saveData } from "./storage";
const labels: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  transfer: "โอนเงิน",
  debt_payment: "จ่ายหนี้",
};
const icons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  debt_payment: CreditCard,
};
const walletTypes = {
  bank: "บัญชีธนาคาร",
  cash: "เงินสด",
  ewallet: "อีวอลเล็ต",
  saving: "เงินออม",
};
const walletIcons = {
  bank: Landmark,
  cash: Banknote,
  ewallet: WalletIcon,
  saving: PiggyBank,
};
const failure = (error: unknown) =>
  error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
function Amount({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return <span className={`amount ${className}`}>{money(value)}</span>;
}
function Sheet({
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
function Field({ label, children }: { label: string; children: ReactNode }) {
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
function ErrorText({ text }: { text: string }) {
  return text ? (
    <p className="error" role="alert">
      {text}
    </p>
  ) : null;
}
function TxRows({
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
export function App() {
  const [initial] = useState(() => {
    try {
      return { data: loadData(), error: "" };
    } catch (e) {
      return { data: null, error: failure(e) };
    }
  });
  const [data, setData] = useState<Data | null>(initial.data);
  const [page, setPage] = useState("dashboard");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [modal, setModal] = useState<
    "transaction" | "wallet" | "debt" | "plan" | null
  >(null);
  const [editWallet, setEditWallet] = useState<Wallet>();
  const [editDebt, setEditDebt] = useState<DebtAccount>();
  const [history, setHistory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (receipt) URL.revokeObjectURL(receipt.url);
    },
    [receipt],
  );
  // A second tab is read-only until reload to prevent silent lost updates.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const listen = (e: StorageEvent) => {
      if (e.key === "day-finance-pro:v2") setStale(true);
    };
    window.addEventListener("storage", listen);
    return () => window.removeEventListener("storage", listen);
  }, []);
  const commit = (next: Data) => {
    if (stale) throw new Error("มีการแก้ไขจากแท็บอื่น กรุณาโหลดหน้าใหม่");
    saveData(next);
    setData(next);
  };
  const showReceipt = async (tx: Transaction) => {
    try {
      const r = data!.receipts.find(
        (r) => r.transactionId === tx.transactionId,
      )!;
      const blob = await getReceipt(r.blobId);
      setReceipt({ url: URL.createObjectURL(blob), name: r.fileName });
    } catch (e) {
      setNotice(failure(e));
    }
  };
  if (!data)
    return (
      <main className="fatal">
        <ShieldCheck />
        <h1>เปิดข้อมูลไม่ได้</h1>
        <p role="alert">{initial.error}</p>
        <p>
          ข้อมูลเดิมจะไม่ถูกเขียนทับ
          ตรวจสอบสิทธิ์พื้นที่เก็บข้อมูลของเบราว์เซอร์ แล้วโหลดหน้าใหม่
        </p>
        <button onClick={() => location.reload()}>ลองอีกครั้ง</button>
      </main>
    );
  const plan = planFor(data, month),
    percentages = allocation(plan),
    txs = actualForMonth(data, month),
    balance = data.wallets.reduce((s, w) => s + walletBalance(data, w), 0);
  const currentInstallments = data.installments.filter(
    (i) => i.monthId === month,
  );
  const paid = currentInstallments.reduce(
      (s, i) => s + paidFor(data, i.installmentId),
      0,
    ),
    outstanding = currentInstallments.reduce(
      (s, i) => s + outstandingFor(data, i.installmentId),
      0,
    );
  const filtered = txs.filter(
    (tx) =>
      (filter === "all" || tx.type === filter) &&
      (!history || tx.fromWalletId === history || tx.toWalletId === history) &&
      [
        tx.note,
        labels[tx.type],
        data.categories.find((c) => c.categoryId === tx.categoryId)?.name,
        data.wallets.find((w) => w.walletId === tx.fromWalletId)?.name,
        data.wallets.find((w) => w.walletId === tx.toWalletId)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="app">
      <aside className="desktop-brand">
        <div className="brand-mark">
          D<span>•</span>
        </div>
        <strong>
          DAY<span> Finance Pro</span>
        </strong>
        <small>YOUR MONEY. YOUR WAY.</small>
        <div className="aside-note">
          <ShieldCheck size={22} />
          <p>
            พื้นที่เล็ก ๆ<br />
            เพื่ออนาคตที่ใหญ่ขึ้น
          </p>
        </div>
        <span className="version">LOCAL PROTOTYPE · V2.0</span>
      </aside>
      <main className="main" inert={modal !== null || receipt !== null}>
        <header className="header">
          <div className="brand-mobile">
            <div className="brand-mark small">
              D<span>•</span>
            </div>
            <div>
              <h1>
                DAY Finance Pro<span className="version-pill">2.0</span>
              </h1>
              <p>จัดการเงินส่วนตัว</p>
            </div>
          </div>
          <label className="month-label">
            <span>เดือนที่ดู</span>
            <input
              aria-label="เลือกเดือน"
              type="month"
              value={month}
              min="1900-01"
              max="9999-12"
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
        </header>
        <div className="prototype">
          <span className="status-dot" /> ข้อมูลตัวอย่าง · Local Prototype{" "}
          <span>เก็บในอุปกรณ์นี้เท่านั้น ไม่ใช่ระบบสำรองข้อมูลการเงินจริง</span>
        </div>
        {stale && (
          <p className="error" role="alert">
            มีการเปลี่ยนข้อมูลจากแท็บอื่น กรุณาโหลดหน้าใหม่ก่อนบันทึก{" "}
            <button onClick={() => location.reload()}>โหลดใหม่</button>
          </p>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              className="icon-button"
              aria-label="ปิดข้อความ"
              onClick={() => setNotice("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {page === "dashboard" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR MONTH AT A GLANCE</p>
                <h2>
                  สรุปการเงิน<span className="muted-dot">.</span>
                </h2>
              </div>
              <button className="secondary" onClick={() => setModal("plan")}>
                <Pencil size={15} />
                แก้ไขแผน
              </button>
            </div>
            <section className="hero-card">
              <div className="section-head">
                <span>เงินคงเหลือตามแผน</span>
                <span className={`badge ${plan.remaining < 0 ? "danger" : ""}`}>
                  <span className="status-dot" />
                  {plan.remaining < 0 ? "เกินงบ" : "อยู่ในงบ"}
                </span>
              </div>
              <Amount
                value={plan.remaining}
                className={plan.remaining < 0 ? "expense" : ""}
              />
              <p>วางแผนวันนี้ เพื่อความสบายใจในวันข้างหน้า</p>
              <div className="hero-bottom">
                <span>
                  <TrendingUp size={16} /> แผนประจำเดือน {month}
                </span>
                <span>THB</span>
              </div>
            </section>
            <div className="summary-grid">
              {[
                {
                  label: "รายรับรวมตามแผน",
                  value: plan.income,
                  type: "income",
                  Icon: ArrowDownLeft,
                },
                {
                  label: "รายจ่ายตามแผน",
                  value: plan.expenses,
                  type: "expense",
                  Icon: ArrowUpRight,
                },
                {
                  label: "หนี้ที่ต้องจ่ายตามแผน",
                  value: plan.debt,
                  type: "debt_payment",
                  Icon: CreditCard,
                },
                {
                  label: "เงินเก็บตามแผน",
                  value: plan.savings,
                  type: "income",
                  Icon: PiggyBank,
                },
              ].map(({ label, value, type, Icon }) => (
                <section className="summary-card" key={label}>
                  <div className="section-head">
                    <span className={`mini-icon ${type}`}>
                      <Icon size={18} />
                    </span>
                    <span className="tiny-label">ตามแผน</span>
                  </div>
                  <p>{label}</p>
                  <Amount value={value} />
                </section>
              ))}
            </div>
            <section className="panel allocation">
              <div className="section-head">
                <h3>สัดส่วนเงินตามแผน</h3>
                <span className="tiny-label">
                  {plan.remaining < 0
                    ? "ยอดจัดสรรเกินรายรับ"
                    : "ภาพรวมเดือนนี้"}
                </span>
              </div>
              <div className="allocation-bar" aria-label="สัดส่วนการจัดสรร">
                {percentages.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      width: `${p}%`,
                      background: ["#22C55E", "#F59E0B", "#EF4444", "#38BDF8"][
                        i
                      ],
                    }}
                  />
                ))}
              </div>
              <div className="legend">
                {["เงินเก็บ", "รายจ่าย", "หนี้", "เงินเหลือ"].map((name, i) => (
                  <span key={name}>
                    <i
                      style={{
                        background: [
                          "#22C55E",
                          "#F59E0B",
                          "#EF4444",
                          "#38BDF8",
                        ][i],
                      }}
                    />
                    {name} <b>{percentages[i].toFixed(0)}%</b>
                  </span>
                ))}
              </div>
            </section>
            <div className="section-head block-heading">
              <h3>รายการจริงล่าสุด</h3>
              <button
                className="text-button"
                onClick={() => {
                  setPage("transactions");
                  setHistory(null);
                }}
              >
                ดูทั้งหมด <ChevronRight size={15} />
              </button>
            </div>
            <section className="panel">
              <TxRows
                data={data}
                transactions={txs.slice(0, 5)}
                onReceipt={showReceipt}
              />
            </section>
          </>
        )}
        {page === "wallets" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">YOUR EVERYDAY ACCOUNTS</p>
                <h2>
                  กระเป๋าของคุณ<span className="muted-dot">.</span>
                </h2>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setEditWallet(undefined);
                  setModal("wallet");
                }}
              >
                <Plus size={16} />
                เพิ่มกระเป๋า
              </button>
            </div>
            <section className="hero-card">
              <span>ยอดเงินจริงรวมทุกกระเป๋า</span>
              <Amount value={balance} />
              <p>ยอดสะสมทุกเดือน · ไม่หักเงินเก็บตามแผน</p>
            </section>
            <div className="wallet-grid">
              {data.wallets.map((w) => {
                const Icon = walletIcons[w.type];
                const amount = walletBalance(data, w);
                return (
                  <section
                    className="wallet-card"
                    key={w.walletId}
                    style={{ "--wallet-color": w.color } as React.CSSProperties}
                  >
                    <div className="section-head">
                      <div className="wallet-symbol">
                        <Icon size={23} />
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`แก้ไข ${w.name}`}
                        onClick={() => {
                          setEditWallet(w);
                          setModal("wallet");
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                    </div>
                    <h3>{w.name}</h3>
                    <p>{walletTypes[w.type]}</p>
                    <Amount
                      value={amount}
                      className={amount < 0 ? "expense" : ""}
                    />
                    {amount < 0 && (
                      <small className="expense">
                        ยอดติดลบ · ตรวจสอบรายการของกระเป๋านี้
                      </small>
                    )}
                    <button
                      className="wallet-history"
                      onClick={() => {
                        setHistory(w.walletId);
                        setPage("transactions");
                        setFilter("all");
                        setSearch("");
                      }}
                    >
                      ดูประวัติเดือนที่เลือก <ChevronRight size={16} />
                    </button>
                  </section>
                );
              })}
            </div>
            <p className="footnote">
              อนุญาตยอดติดลบเพื่อให้บันทึกรายการย้อนหลังได้
              โดยแสดงคำเตือนในกระเป๋า
            </p>
          </>
        )}
        {page === "debts" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">ONE STEP CLOSER TO FREEDOM</p>
                <h2>
                  จัดการหนี้<span className="muted-dot">.</span>
                </h2>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setEditDebt(undefined);
                  setModal("debt");
                }}
              >
                <Plus size={16} />
                เพิ่มหนี้
              </button>
            </div>
            <section className="hero-card debt-hero">
              <span>ยอดหนี้คงเหลือทั้งหมด</span>
              <Amount
                value={data.debts.reduce(
                  (s, d) =>
                    s +
                    Math.max(
                      0,
                      d.principalMinor -
                        data.installments
                          .filter((i) => i.debtId === d.debtId)
                          .reduce(
                            (n, i) => n + paidFor(data, i.installmentId),
                            0,
                          ),
                    ),
                  0,
                )}
              />
              <p>คำนวณจากยอดตั้งต้น หักการชำระจริงทุกเดือน</p>
            </section>
            <div className="debt-stats">
              <div>
                <small>ครบกำหนดเดือนนี้</small>
                <Amount value={plan.debt} />
              </div>
              <div>
                <small>ชำระจริงให้งวดเดือนนี้</small>
                <Amount value={paid} className="income" />
              </div>
              <div>
                <small>ค้างชำระงวดเดือนนี้</small>
                <Amount value={outstanding} className="debt_payment" />
              </div>
            </div>
            {data.debts.length === 0 && (
              <div className="empty">ยังไม่มีหนี้</div>
            )}
            {data.debts.map((debt) => {
              const all = data.installments.filter(
                  (i) => i.debtId === debt.debtId,
                ),
                paidAll = all.reduce(
                  (s, i) => s + paidFor(data, i.installmentId),
                  0,
                );
              return (
                <section className="panel debt-card" key={debt.debtId}>
                  <div className="section-head">
                    <div className="debt-title">
                      <div className="tx-icon debt_payment">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h3>{debt.name}</h3>
                        <small>ทั้งหมด {all.length} งวด</small>
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`แก้ไข ${debt.name}`}
                      onClick={() => {
                        setEditDebt(debt);
                        setModal("debt");
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                  </div>
                  <div className="debt-balance">
                    <span>
                      คงเหลือ{" "}
                      <Amount
                        value={Math.max(0, debt.principalMinor - paidAll)}
                      />
                    </span>
                    <small>
                      ชำระแล้ว{" "}
                      {debt.principalMinor
                        ? Math.min(
                            100,
                            Math.round((paidAll / debt.principalMinor) * 100),
                          )
                        : 0}
                      %
                    </small>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${debt.principalMinor ? Math.min(100, (paidAll / debt.principalMinor) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  {debt.note && <p className="footnote">{debt.note}</p>}
                  <div className="installments">
                    {all.filter((i) => i.monthId === month).length === 0 ? (
                      <p className="footnote">
                        ไม่มีงวดครบกำหนดในเดือน {month}
                      </p>
                    ) : (
                      all
                        .filter((i) => i.monthId === month)
                        .map((i) => (
                          <div className="installment" key={i.installmentId}>
                            <div>
                              <strong>งวดที่ {i.installmentNo}</strong>
                              <small>ครบกำหนด {i.dueDate}</small>
                            </div>
                            <div>
                              <Amount value={i.amountDueMinor} />
                              <small
                                className={
                                  installmentStatus(data, i.installmentId) ===
                                  "paid"
                                    ? "income"
                                    : "debt_payment"
                                }
                              >
                                {
                                  {
                                    unpaid: "ยังไม่ชำระ",
                                    partial: "ชำระบางส่วน",
                                    paid: "ชำระแล้ว",
                                  }[installmentStatus(data, i.installmentId)]
                                }
                              </small>
                              <small>
                                ค้าง{" "}
                                {money(outstandingFor(data, i.installmentId))}
                              </small>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  <details>
                    <summary>ตารางงวดทั้งหมด</summary>
                    {all.map((i) => (
                      <div className="schedule-row" key={i.installmentId}>
                        <span>
                          #{i.installmentNo} · {i.dueDate}
                        </span>
                        <span>
                          {money(i.amountDueMinor)} ·{" "}
                          {
                            {
                              unpaid: "ยังไม่ชำระ",
                              partial: "บางส่วน",
                              paid: "ครบแล้ว",
                            }[installmentStatus(data, i.installmentId)]
                          }
                        </span>
                      </div>
                    ))}
                  </details>
                </section>
              );
            })}
          </>
        )}
        {page === "transactions" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">EVERY LITTLE MOVE COUNTS</p>
                <h2>
                  รายการจริง<span className="muted-dot">.</span>
                </h2>
              </div>
              <span className="badge">{filtered.length} รายการ</span>
            </div>
            {history && (
              <div className="history-filter">
                <span>
                  กระเป๋า:{" "}
                  {data.wallets.find((w) => w.walletId === history)?.name}
                </span>
                <button
                  className="text-button"
                  onClick={() => setHistory(null)}
                >
                  ดูทุกกระเป๋า <X size={16} />
                </button>
              </div>
            )}
            <label className="search">
              <Search size={19} />
              <input
                aria-label="ค้นหารายการ"
                placeholder="ค้นหาหมวด กระเป๋า หรือรายละเอียด"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="filter-tabs" aria-label="กรองประเภท">
              {[["all", "ทั้งหมด"], ...Object.entries(labels)].map(
                ([key, label]) => (
                  <button
                    key={key}
                    className={filter === key ? "active" : ""}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <section className="panel">
              <TxRows
                data={data}
                transactions={filtered}
                onReceipt={showReceipt}
              />
            </section>
            <p className="footnote">
              แสดงรายการ posted ในเดือน {month} · การโอนไม่ใช่รายรับหรือรายจ่าย
            </p>
          </>
        )}
        <footer className="main-footer">
          <ShieldCheck size={14} />
          <span>ข้อมูลอยู่กับคุณ ไม่มีการเชื่อมต่อธนาคาร</span>
        </footer>
      </main>
      <nav
        inert={modal !== null || receipt !== null}
        className="bottom-nav"
        aria-label="เมนูหลัก"
      >
        {[
          { key: "dashboard", label: "สรุป", Icon: LayoutDashboard },
          { key: "wallets", label: "กระเป๋า", Icon: WalletIcon },
          { key: "add", label: "เพิ่มรายการ", Icon: Plus },
          { key: "debts", label: "หนี้", Icon: CreditCard },
          { key: "transactions", label: "รายการ", Icon: List },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            aria-label={label}
            aria-current={page === key ? "page" : undefined}
            className={
              key === "add"
                ? "add-button"
                : page === key
                  ? "nav-item active"
                  : "nav-item"
            }
            onClick={() => {
              if (key === "add") setModal("transaction");
              else {
                setPage(key);
                if (key === "transactions") setHistory(null);
                window.scrollTo({ top: 0 });
              }
            }}
          >
            <Icon size={key === "add" ? 27 : 21} />
            {key !== "add" && <span>{label}</span>}
          </button>
        ))}
      </nav>
      {modal === "transaction" && (
        <Sheet title="เพิ่มรายการจริง" onClose={() => setModal(null)}>
          <TransactionForm
            data={data}
            stale={stale}
            onSave={(next) => {
              setData(next);
              setModal(null);
              setNotice("บันทึกรายการแล้ว ยอดเงินจริงอัปเดตเรียบร้อย");
            }}
          />
        </Sheet>
      )}
      {modal === "wallet" && (
        <Sheet
          title={editWallet ? "แก้ไขกระเป๋า" : "เพิ่มกระเป๋า"}
          onClose={() => setModal(null)}
        >
          <WalletForm
            wallet={editWallet}
            onSave={(w) => {
              commit({
                ...data,
                wallets: editWallet
                  ? data.wallets.map((item) =>
                      item.walletId === w.walletId ? w : item,
                    )
                  : [...data.wallets, w],
              });
              setModal(null);
            }}
          />
        </Sheet>
      )}
      {modal === "debt" && (
        <Sheet
          title={editDebt ? "แก้ไขหนี้และงวด" : "เพิ่มหนี้"}
          onClose={() => setModal(null)}
        >
          <DebtForm
            data={data}
            debt={editDebt}
            onSave={(debt, installments) => {
              commit({
                ...data,
                debts: editDebt
                  ? data.debts.map((d) => (d.debtId === debt.debtId ? debt : d))
                  : [...data.debts, debt],
                installments: [
                  ...data.installments.filter((i) => i.debtId !== debt.debtId),
                  ...installments,
                ],
              });
              setModal(null);
            }}
          />
        </Sheet>
      )}
      {modal === "plan" && (
        <Sheet title={`แก้ไขแผน ${month}`} onClose={() => setModal(null)}>
          <PlanForm
            data={data}
            month={month}
            onSave={(next) => {
              commit(next);
              setModal(null);
            }}
          />
        </Sheet>
      )}
      {receipt && (
        <Sheet title="สลิปแนบรายการ" onClose={() => setReceipt(null)}>
          <img className="receipt-image" src={receipt.url} alt={receipt.name} />
          <p className="footnote">{receipt.name}</p>
        </Sheet>
      )}
    </div>
  );
}
function TransactionForm({
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
function WalletForm({
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
function PlanForm({
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
function DebtForm({
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

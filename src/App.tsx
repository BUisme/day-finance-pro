import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  Plus,
  CreditCard,
  List,
  ShieldCheck,
  X,
  ArrowUpRight,
} from "lucide-react";
import type { DebtAccount, Transaction, Wallet } from "./models";
import { today } from "./finance";
import { getReceipt } from "./storage";
import { useFinance } from "./hooks/useFinance";
import { failure } from "./lib/presentation";
import { Sheet } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Wallets } from "./pages/Wallets";
import { Debts } from "./pages/Debts";
import { Transactions } from "./pages/Transactions";
import { TransactionForm } from "./forms/TransactionForm";
import { WalletForm } from "./forms/WalletForm";
import { DebtForm } from "./forms/DebtForm";
import { PlanForm } from "./forms/PlanForm";
type Page = "dashboard" | "wallets" | "debts" | "transactions";
type Editor =
  | { type: "transaction" }
  | { type: "plan" }
  | { type: "wallet"; wallet?: Wallet }
  | { type: "debt"; debt?: DebtAccount };
const navigation = [
  { page: "dashboard", label: "สรุป", Icon: LayoutDashboard },
  { page: "wallets", label: "กระเป๋า", Icon: WalletIcon },
  { page: "debts", label: "หนี้", Icon: CreditCard },
  { page: "transactions", label: "รายการ", Icon: List },
] as const;
export function App() {
  const { data, error, stale, commit, acceptPersisted } = useFinance();
  const [page, setPage] = useState<Page>("dashboard"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [editor, setEditor] = useState<Editor | null>(null),
    [walletId, setWalletId] = useState<string>(),
    [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (receipt) URL.revokeObjectURL(receipt.url);
    },
    [receipt],
  );
  const navigate = (next: Page) => {
    setPage(next);
    setWalletId(undefined);
    window.scrollTo({ top: 0 });
  };
  const showReceipt = async (tx: Transaction) => {
    try {
      const record = data!.receipts.find(
        (r) => r.transactionId === tx.transactionId,
      );
      if (!record) throw new Error("ไม่พบข้อมูลสลิป");
      const blob = await getReceipt(record.blobId);
      setReceipt({ url: URL.createObjectURL(blob), name: record.fileName });
    } catch (e) {
      setNotice(failure(e));
    }
  };
  if (!data)
    return (
      <main className="fatal">
        <ShieldCheck size={40} />
        <h1>เปิดข้อมูลไม่ได้</h1>
        <p role="alert">{error}</p>
        <p>
          ข้อมูลที่บันทึกไว้ยังอยู่
          กรุณาตรวจสอบสิทธิ์พื้นที่เก็บข้อมูลของเบราว์เซอร์
        </p>
        <button className="primary" onClick={() => location.reload()}>
          ลองอีกครั้ง
        </button>
      </main>
    );
  const modalOpen = editor !== null || receipt !== null;
  return (
    <div className="app-shell">
      <aside className="sidebar" inert={modalOpen}>
        <div className="brand">
          <span className="brand-logo">
            D<span>•</span>
          </span>
          <div>
            <strong>DAY</strong>
            <small>FINANCE PRO</small>
          </div>
        </div>
        <p className="eyebrow">พื้นที่สำหรับการเงินของคุณ</p>
        <nav aria-label="เมนูเดสก์ท็อป">
          {navigation.map(({ page: key, label, Icon }) => (
            <button
              key={key}
              aria-label={`${label} เดสก์ท็อป`}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ArrowUpRight size={32} />
          <p>
            เริ่มจากวันนี้
            <br />
            ไปให้ถึงเป้าหมาย
          </p>
          <small>LOCAL PROTOTYPE · 2.0</small>
        </div>
      </aside>
      <main className="main" inert={modalOpen}>
        <header className="header">
          <div className="header-brand">
            <span className="brand-logo">
              D<span>•</span>
            </span>
            <div>
              <h1>DAY Finance Pro</h1>
              <p>จัดการเงินส่วนตัว</p>
            </div>
          </div>
          <label className="month-control">
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
          <ShieldCheck size={16} />
          <div>
            <strong>Local Prototype · มีข้อมูลตัวอย่าง</strong>
            <p>ข้อมูลอยู่ในอุปกรณ์นี้ ไม่ใช่ระบบสำรองข้อมูลการเงินจริง</p>
          </div>
        </div>
        {stale && (
          <p className="error" role="alert">
            มีการแก้ไขจากแท็บอื่น กรุณาโหลดหน้าใหม่ก่อนบันทึก{" "}
            <button onClick={() => location.reload()}>โหลดใหม่</button>
          </p>
        )}
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
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
          <Dashboard
            data={data}
            month={month}
            onPlan={() => setEditor({ type: "plan" })}
            onTransactions={() => navigate("transactions")}
            onReceipt={showReceipt}
          />
        )}
        {page === "wallets" && (
          <Wallets
            data={data}
            onEdit={(wallet) => setEditor({ type: "wallet", wallet })}
            onHistory={(id) => {
              setWalletId(id);
              setPage("transactions");
            }}
          />
        )}
        {page === "debts" && (
          <Debts
            data={data}
            month={month}
            onEdit={(debt) => setEditor({ type: "debt", debt })}
          />
        )}
        {page === "transactions" && (
          <Transactions
            data={data}
            month={month}
            walletId={walletId}
            onClear={() => setWalletId(undefined)}
            onReceipt={showReceipt}
          />
        )}
        <footer className="main-footer">
          <ShieldCheck size={14} />
          เก็บข้อมูลในอุปกรณ์ · ไม่มีการเชื่อมต่อธนาคาร
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="เมนูหลัก" inert={modalOpen}>
        {navigation.map(({ page: key, label, Icon }, index) => (
          <div className="nav-slot" key={key}>
            {index === 2 && (
              <button
                className="add-button"
                aria-label="เพิ่มรายการ"
                onClick={() => setEditor({ type: "transaction" })}
              >
                <Plus size={27} />
              </button>
            )}
            <button
              className="nav-item"
              aria-label={label}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          </div>
        ))}
      </nav>
      {editor && (
        <Sheet
          title={
            editor.type === "transaction"
              ? "เพิ่มรายการจริง"
              : editor.type === "plan"
                ? `แก้ไขแผน ${month}`
                : editor.type === "wallet"
                  ? editor.wallet
                    ? "แก้ไขกระเป๋า"
                    : "เพิ่มกระเป๋า"
                  : editor.debt
                    ? "แก้ไขหนี้และงวด"
                    : "เพิ่มหนี้"
          }
          onClose={() => setEditor(null)}
        >
          {editor.type === "transaction" && (
            <TransactionForm
              data={data}
              stale={stale}
              onSave={(next) => {
                acceptPersisted(next);
                setEditor(null);
                setNotice("บันทึกรายการแล้ว ยอดเงินจริงอัปเดตเรียบร้อย");
              }}
            />
          )}
          {editor.type === "plan" && (
            <PlanForm
              data={data}
              month={month}
              onSave={(next) => {
                commit(next);
                setEditor(null);
              }}
            />
          )}
          {editor.type === "wallet" && (
            <WalletForm
              wallet={editor.wallet}
              onSave={(wallet) => {
                commit({
                  ...data,
                  wallets: editor.wallet
                    ? data.wallets.map((w) =>
                        w.walletId === wallet.walletId ? wallet : w,
                      )
                    : [...data.wallets, wallet],
                });
                setEditor(null);
              }}
            />
          )}
          {editor.type === "debt" && (
            <DebtForm
              data={data}
              debt={editor.debt}
              onSave={(debt, installments) => {
                commit({
                  ...data,
                  debts: editor.debt
                    ? data.debts.map((d) =>
                        d.debtId === debt.debtId ? debt : d,
                      )
                    : [...data.debts, debt],
                  installments: [
                    ...data.installments.filter(
                      (i) => i.debtId !== debt.debtId,
                    ),
                    ...installments,
                  ],
                });
                setEditor(null);
              }}
            />
          )}
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

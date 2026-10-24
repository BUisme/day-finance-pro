import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  Pencil,
  ArrowRight,
} from "lucide-react";
import type { Data, Transaction } from "../models";
import { actualForMonth, allocation, planFor, walletBalance } from "../finance";
import { Amount, TxRows } from "../components/ui";
export function Dashboard({
  data,
  month,
  onPlan,
  onTransactions,
  onReceipt,
}: {
  data: Data;
  month: string;
  onPlan: () => void;
  onTransactions: () => void;
  onReceipt: (t: Transaction) => void;
}) {
  const plan = planFor(data, month),
    widths = allocation(plan);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE ROOM FOR YOUR FUTURE</p>
          <h2>สรุปการเงิน.</h2>
        </div>
        <button className="secondary" onClick={onPlan}>
          <Pencil size={16} />
          แก้ไขแผน
        </button>
      </div>
      <div className="dashboard-top">
        <section className="hero-card">
          <div className="section-head">
            <span>เงินคงเหลือตามแผน</span>
            <span
              className={plan.remaining < 0 ? "badge expense" : "badge income"}
            >
              {plan.remaining < 0 ? "เกินงบ" : "อยู่ในงบ"}
            </span>
          </div>
          <Amount value={plan.remaining} />
          <p>แผนประจำเดือน {month} · ไม่ใช่ยอดเงินจริง</p>
          <div className="hero-line">
            <span>ก้าวเล็ก ๆ สู่เป้าหมายที่ใหญ่ขึ้น</span>
            <span>THB</span>
          </div>
        </section>
        <section className="actual-card">
          <div className="section-head">
            <span className="eyebrow">ACTUAL BALANCE</span>
            <PiggyBank size={20} />
          </div>
          <p>ยอดเงินจริงทุกกระเป๋า</p>
          <Amount
            value={data.wallets.reduce(
              (sum, w) => sum + walletBalance(data, w),
              0,
            )}
          />
          <small>ยอดสะสมข้ามเดือน</small>
        </section>
      </div>
      <div className="summary-grid">
        {[
          {
            label: "รายรับรวมตามแผน",
            value: plan.income,
            Icon: ArrowDownLeft,
            type: "income",
          },
          {
            label: "รายจ่ายตามแผน",
            value: plan.expenses,
            Icon: ArrowUpRight,
            type: "expense",
          },
          {
            label: "หนี้ที่ต้องจ่ายตามแผน",
            value: plan.debt,
            Icon: CreditCard,
            type: "debt_payment",
          },
          {
            label: "เงินเก็บตามแผน",
            value: plan.savings,
            Icon: PiggyBank,
            type: "income",
          },
        ].map(({ label, value, Icon, type }) => (
          <section className="summary-card" key={label}>
            <Icon className={type} size={22} />
            <p>{label}</p>
            <Amount value={value} />
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="section-head">
          <h3>สัดส่วนเงินตามแผน</h3>
          <small>
            {plan.remaining < 0 ? "จัดสรรเกินรายรับ" : "ทุกบาทมีเป้าหมาย"}
          </small>
        </div>
        <div className="allocation-bar">
          {widths.map((width, i) => (
            <span
              key={i}
              style={{
                width: `${width}%`,
                background: ["#22c55e", "#f59e0b", "#ef4444", "#38bdf8"][i],
              }}
            />
          ))}
        </div>
        <div className="legend">
          {["เงินเก็บ", "รายจ่าย", "หนี้", "เงินเหลือ"].map((label, i) => (
            <span key={label}>
              <i
                style={{
                  background: ["#22c55e", "#f59e0b", "#ef4444", "#38bdf8"][i],
                }}
              />
              {label}
              <b>{widths[i].toFixed(0)}%</b>
            </span>
          ))}
        </div>
      </section>
      <div className="section-head block-heading">
        <h3>รายการจริงล่าสุด</h3>
        <button className="text-button" onClick={onTransactions}>
          ดูทั้งหมด <ArrowRight size={16} />
        </button>
      </div>
      <section className="panel">
        <TxRows
          data={data}
          transactions={actualForMonth(data, month).slice(0, 5)}
          onReceipt={onReceipt}
        />
      </section>
    </>
  );
}

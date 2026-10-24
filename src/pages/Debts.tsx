import { Plus, Pencil, CreditCard } from "lucide-react";
import type { Data, DebtAccount } from "../models";
import { paidFor, outstandingFor, installmentStatus } from "../finance";
import { Amount } from "../components/ui";
const status = {
  unpaid: "ยังไม่ชำระ",
  partial: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
};
export function Debts({
  data,
  month,
  onEdit,
}: {
  data: Data;
  month: string;
  onEdit: (d?: DebtAccount) => void;
}) {
  const current = data.installments.filter((i) => i.monthId === month),
    due = current.reduce((s, i) => s + i.amountDueMinor, 0),
    paid = current.reduce((s, i) => s + paidFor(data, i.installmentId), 0),
    outstanding = current.reduce(
      (s, i) => s + outstandingFor(data, i.installmentId),
      0,
    );
  const remaining = (d: DebtAccount) =>
    Math.max(
      0,
      d.principalMinor -
        data.installments
          .filter((i) => i.debtId === d.debtId)
          .reduce((s, i) => s + paidFor(data, i.installmentId), 0),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE CLOSER TO FREEDOM</p>
          <h2>จัดการหนี้.</h2>
        </div>
        <button className="secondary" onClick={() => onEdit()}>
          <Plus size={16} />
          เพิ่มหนี้
        </button>
      </div>
      <section className="hero-card debt-hero">
        <span>ยอดหนี้คงเหลือทั้งหมด</span>
        <Amount value={data.debts.reduce((s, d) => s + remaining(d), 0)} />
        <p>ยอดตั้งต้นหักการชำระจริงทุกเดือน</p>
      </section>
      <div className="debt-stats">
        {[
          { label: "ครบกำหนดเดือนนี้", value: due, type: "" },
          { label: "ชำระจริงให้งวดเดือนนี้", value: paid, type: "income" },
          {
            label: "ค้างชำระงวดเดือนนี้",
            value: outstanding,
            type: "debt_payment",
          },
        ].map((item) => (
          <div key={item.label}>
            <small>{item.label}</small>
            <Amount value={item.value} className={item.type} />
          </div>
        ))}
      </div>
      {data.debts.map((debt) => {
        const all = data.installments.filter((i) => i.debtId === debt.debtId),
          progress = debt.principalMinor
            ? Math.min(
                100,
                ((debt.principalMinor - remaining(debt)) /
                  debt.principalMinor) *
                  100,
              )
            : 0;
        return (
          <section className="panel" key={debt.debtId}>
            <div className="section-head">
              <div className="debt-title">
                <CreditCard className="debt_payment" />
                <div>
                  <h3>{debt.name}</h3>
                  <small>{all.length} งวด</small>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label={`แก้ไข ${debt.name}`}
                onClick={() => onEdit(debt)}
              >
                <Pencil size={17} />
              </button>
            </div>
            <div className="debt-balance">
              <span>
                คงเหลือ <Amount value={remaining(debt)} />
              </span>
              <small>ชำระแล้ว {progress.toFixed(0)}%</small>
            </div>
            <div className="progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="footnote">{debt.note}</p>
            {all
              .filter((i) => i.monthId === month)
              .map((i) => (
                <div className="installment" key={i.installmentId}>
                  <div>
                    <strong>งวดที่ {i.installmentNo}</strong>
                    <small>ครบกำหนด {i.dueDate}</small>
                  </div>
                  <div>
                    <Amount value={i.amountDueMinor} />
                    <small className="debt_payment">
                      {status[installmentStatus(data, i.installmentId)]}
                    </small>
                    <small>
                      ค้าง{" "}
                      <Amount value={outstandingFor(data, i.installmentId)} />
                    </small>
                  </div>
                </div>
              ))}
            {!all.some((i) => i.monthId === month) && (
              <p className="footnote">ไม่มีงวดครบกำหนดเดือน {month}</p>
            )}
            <details>
              <summary>ตารางงวดทั้งหมด</summary>
              {all.map((i) => (
                <div className="schedule-row" key={i.installmentId}>
                  <span>
                    #{i.installmentNo} · {i.dueDate}
                  </span>
                  <div>
                    <Amount value={i.amountDueMinor} />
                    <small>
                      {status[installmentStatus(data, i.installmentId)]}
                    </small>
                  </div>
                </div>
              ))}
            </details>
          </section>
        );
      })}
      {data.debts.length === 0 && (
        <div className="empty">ยังไม่มีหนี้ เพิ่มหนี้เพื่อเริ่มวางแผน</div>
      )}
    </>
  );
}

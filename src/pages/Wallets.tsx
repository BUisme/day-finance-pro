import { Plus, Pencil, ArrowRight } from "lucide-react";
import type { Data, Wallet } from "../models";
import { walletBalance } from "../finance";
import { Amount } from "../components/ui";
import { walletIcons, walletTypes } from "../lib/presentation";
export function Wallets({
  data,
  onEdit,
  onHistory,
}: {
  data: Data;
  onEdit: (w?: Wallet) => void;
  onHistory: (walletId: string) => void;
}) {
  const total = data.wallets.reduce(
    (sum, w) => sum + walletBalance(data, w),
    0,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONEY IN YOUR HANDS</p>
          <h2>กระเป๋าของคุณ.</h2>
        </div>
        <button className="secondary" onClick={() => onEdit()}>
          <Plus size={16} />
          เพิ่มกระเป๋า
        </button>
      </div>
      <section className="hero-card">
        <span>ยอดเงินจริงรวมทุกกระเป๋า</span>
        <Amount value={total} />
        <p>ยอดสะสมทุกเดือน · เงินออมตามแผนไม่หักยอดนี้</p>
      </section>
      <div className="wallet-grid">
        {data.wallets.map((w) => {
          const Icon = walletIcons[w.type],
            balance = walletBalance(data, w);
          return (
            <section className="wallet-card" key={w.walletId}>
              <div className="section-head">
                <span className="wallet-symbol" style={{ color: w.color }}>
                  <Icon size={25} />
                </span>
                <button
                  className="icon-button"
                  aria-label={`แก้ไข ${w.name}`}
                  onClick={() => onEdit(w)}
                >
                  <Pencil size={17} />
                </button>
              </div>
              <small>{walletTypes[w.type]}</small>
              <h3>{w.name}</h3>
              <Amount
                value={balance}
                className={balance < 0 ? "expense" : ""}
              />
              {balance < 0 && (
                <p className="warning">ยอดติดลบ · ตรวจสอบรายการของกระเป๋านี้</p>
              )}
              <button
                className="wallet-history"
                onClick={() => onHistory(w.walletId)}
              >
                ประวัติเดือนที่เลือก <ArrowRight size={16} />
              </button>
            </section>
          );
        })}
      </div>
      <p className="footnote">
        อนุญาตยอดติดลบสำหรับการบันทึกย้อนหลัง พร้อมแสดงคำเตือน
      </p>
    </>
  );
}

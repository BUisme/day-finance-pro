# DAY Finance Pro 2.0

ต้นแบบเว็บแอปจัดการเงินส่วนตัวภาษาไทย แบบ mobile-first โทน Dark Fintech สร้างด้วย React 19, TypeScript, Vite, Tailwind CSS และ lucide-react

> **Local Prototype — มีข้อมูลตัวอย่าง ไม่ใช่ระบบสำรองข้อมูลการเงินจริง** ข้อมูลอยู่ใน browser profile และ origin ของอุปกรณ์นี้เท่านั้น การล้างข้อมูลเบราว์เซอร์หรือเปลี่ยน origin จะทำให้เข้าถึงข้อมูลเดิมไม่ได้ ไม่มี login, sync หรือการเชื่อมธนาคาร

## เริ่มใช้งาน

ใช้ Node.js 22 ขึ้นไป (ทดสอบด้วย Node 24.19.0 และ npm 11.9.0)

```sh
npm ci --cache /tmp/day-npm-cache
npm run dev
```

เปิด Vite ในเบราว์เซอร์ด้วย origin เดิมเพื่อใช้งานข้อมูลที่เคยบันทึกไว้ ไม่ต้องตั้งค่า environment variables หรือ credentials

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e # ต้อง build ก่อน: ทดสอบ dist ด้วย Vite preview
```

CI ติดตั้ง Playwright Chromium อัตโนมัติ และทดสอบ typecheck, unit, build, E2E ทุก push/PR

E2E ใช้ Chromium ที่ `/usr/bin/chromium` หรือกำหนด `CHROMIUM_PATH` เป็น path ของ browser ที่ติดตั้งไว้แล้ว เช่น `CHROMIUM_PATH=/path/to/chromium npm run test:e2e` หากไม่มี system browser ให้ติดตั้งด้วย `npx playwright install --with-deps chromium` ก่อน ระบบจะใช้ browser ของ Playwright และเริ่ม Vite preview สำหรับ production build อัตโนมัติ ห้ามรัน E2E กับ browser profile ที่มีข้อมูลเงินจริง

## สิ่งที่ทำได้

- **สรุป:** เลือกเดือน, แก้ไขแผนรายรับ/รายจ่าย/เงินออม, ดูสัดส่วนตามแผนและรายการจริงล่าสุด
- **กระเป๋า:** เพิ่มและแก้ไขกระเป๋า 4 ประเภท ยอดตั้งต้น สี และประวัติเดือนที่เลือก ยอดจริงสะสมข้ามเดือน
- **หนี้:** เพิ่มและแก้ไขหนี้ สร้างตารางงวดคงที่ 1–120 งวด หรือแก้ยอดและวันรายงวด ดูสถานะจากการจ่ายจริงและตารางงวดทั้งหมด
- **รายการ:** ค้นหา กรองเดือนและประเภท ดูสลิป
- **ปุ่ม +:** เพิ่มรายรับ รายจ่าย โอน หรือชำระงวดหนี้ พร้อมแนบ JPG/PNG/WebP ไม่เกิน 5 MB ป้องกัน submit ซ้ำ

ฟอร์ม modal รองรับ Escape, focus trap และคืน focus ข้อมูลถูกบันทึกก่อนแสดงผลสำเร็จ หาก IndexedDB ล้มเหลวจะไม่สร้าง transaction ที่อ้างถึงสลิปที่ไม่มีอยู่ หาก localStorage ล้มเหลวหลังเขียนสลิป ระบบพยายามลบไฟล์ที่ยังไม่ได้อ้างอิง มีการตรวจจับการแก้ไขจากแท็บอื่นและขอ reload ก่อนบันทึกต่อ (แนะนำใช้งานหนึ่งแท็บ ไม่มีการประสานงาน atomic ระหว่างหลายแท็บ)

## กฎการเงิน

จำนวนเงินเป็น integer สตางค์ รับอินพุตทศนิยมไม่เกิน 2 ตำแหน่งและไม่เกิน 1,000,000,000 บาทต่อรายการ

- แผนแยกจากเงินจริง: รายรับตามแผน − รายจ่ายตามแผน − เงินเก็บตามแผน − งวดหนี้เดือนนั้น = เงินคงเหลือตามแผน
- กระเป๋า = ยอดตั้งต้น + posted เงินเข้า/โอนเข้า − posted รายจ่าย/โอนออก/ชำระหนี้ ไม่ถูก reset เมื่อเปลี่ยนเดือน
- โอนหนึ่งรายการมีต้นทางและปลายทาง ยอดรวมกระเป๋าไม่เปลี่ยน
- ยอดชำระงวดคำนวณจาก posted debt payments เท่านั้น ไม่เก็บ paidAmount ซ้ำ
- อนุญาตยอดกระเป๋าติดลบเพื่อบันทึกย้อนหลัง มีคำเตือนในฟอร์มและการ์ดกระเป๋า ยอดตั้งต้นรับค่าไม่ติดลบ
- ห้ามชำระเกินยอดค้างงวด ส่วนยอดหนี้ตั้งต้น = ผลรวมยอดงวด ไม่มีสูตรดอกเบี้ย
- “ชำระจริงให้งวดเดือนนี้” อิงเดือนกำหนดชำระของงวด ส่วนหน้ารายการอิงวันจ่ายจริง จ่ายล่วงหน้าได้
- เมื่อแก้หนี้ที่มีการชำระแล้ว จะคง ID งวดเดิมและห้ามลดงวดต่ำกว่ายอดชำระแล้ว
- รายการ `void` ไม่นับรวมยอด แต่ MVP ยังไม่มี UI แก้ไข/ยกเลิกรายการ

## โครงสร้าง

```text
src/models.ts    TypeScript models
src/finance.ts   การคำนวณและตรวจสอบ ledger (pure functions)
src/seed.ts      ข้อมูลตัวอย่าง สร้างเฉพาะครั้งแรก
src/storage.ts   localStorage metadata + IndexedDB blobs
src/App.tsx      หน้าจอและฟอร์ม
src/styles.css   Design tokens, responsive layout, Tailwind import
 tests/          Vitest unit/persistence และ Playwright browser tests
```

ข้อมูลเล็กอยู่ใน localStorage key `day-finance-pro:v2`; ภาพสลิปอยู่ใน IndexedDB `day-finance-receipts` ไม่ส่งธุรกรรมหรือไฟล์ไปบริการภายนอก ฟอนต์ใช้ Noto Sans Thai / Prompt หากติดตั้งในเครื่อง พร้อม Tahoma / system fallback โดยไม่เรียก font CDN

## ขอบเขตและข้อจำกัด

ไม่มี reference image ในไฟล์แนบที่ได้รับ จึงใช้ tokens ใน brief เป็นแนวทาง ไม่มี export/backup, auth, sync, QR, ดอกเบี้ยซับซ้อน หรือ backend ไม่แตะ AppSheet/Google Sheets ไม่ deploy อัตโนมัติ ไม่ merge PR อัตโนมัติ

V2.1 ควรเพิ่ม backup/restore ที่ผู้ใช้ควบคุม, migration/validation ของข้อมูลเต็มรูปแบบ, การแก้ไขหรือ void transaction และ backend ตามขอบเขตที่อนุมัติแยกต่างหาก


## GitHub Pages

Vite กำหนด `base: '/day-finance-pro/'` ให้ JS/CSS ใน `dist/index.html` ชี้ไปที่ `/day-finance-pro/assets/` แอปใช้ state สำหรับสลับแท็บ ไม่มี pathname router หรือ deep-link routes จึงไม่ต้องเพิ่ม BrowserRouter basename หรือ 404 fallback และไม่เปลี่ยน URL เมื่อสลับแท็บ ห้ามนำ source `index.html` ไปเสิร์ฟตรง ๆ ต้อง deploy ผลลัพธ์ `dist` เท่านั้น

1. Merge branch แก้ไขเข้า `main` ผ่าน PR ตามขั้นตอนของ repository
2. ไปที่ **Settings → Pages → Build and deployment → Source: GitHub Actions** (ไม่ใช่ Deploy from a branch)
3. ตรวจว่า Settings → Actions → General อนุญาต GitHub Actions และ official actions ที่ workflow ใช้ หาก environment `github-pages` มี deployment rules ให้ยอมรับ branch `main` และอนุมัติ deployment เมื่อจำเป็น
4. Workflow **Deploy GitHub Pages** ทำงานเมื่อ push เข้า `main` หรือเลือก Run workflow บน `main` เท่านั้น โดยติดตั้ง ทดสอบ build/upload `dist` และใช้ `actions/deploy-pages@v4` ไม่ใช้ PAT หรือ credentials ใน source ส่วน workflow **Validate MVP** เดิมคงอยู่
5. รอ build/deploy สำเร็จ แล้วเปิด `https://buisme.github.io/day-finance-pro/` ต้องเห็น DAY Finance Pro และสรุปการเงิน ตรวจ Network ว่า JS/CSS มาจาก `/day-finance-pro/assets/` ได้ HTTP 200 หากยังเห็นไฟล์เก่าให้ลอง hard refresh

ทดสอบก่อน deploy: `npm ci --cache /tmp/day-npm-cache && npm run typecheck && npm test && npm run build && npm run test:e2e` Playwright ใช้ production preview ที่ port 4173 และทดสอบ subpath จริง รวมการเปิด Dashboard, asset status/MIME, สลับแท็บ และ reload โดยใช้ browser context แยก ไม่ล้างข้อมูลผู้ใช้

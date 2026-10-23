import type { Data, Receipt, Transaction } from "./models";
import { createSeed } from "./seed";
import { addTransaction, id } from "./finance";
export const STORAGE_KEY = "day-finance-pro:v2";
export function loadData(
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): Data {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    const data = createSeed();
    saveData(data, storage);
    return data;
  }
  const parsed = JSON.parse(raw) as Data;
  if (
    parsed.version !== 2 ||
    ![
      "months",
      "wallets",
      "categories",
      "budgets",
      "debts",
      "installments",
      "transactions",
      "receipts",
    ].every((k) => Array.isArray(parsed[k as keyof Data]))
  )
    throw new Error("ข้อมูลที่บันทึกไว้ไม่รองรับ กรุณาเก็บข้อมูลเดิมก่อนแก้ไข");
  return parsed;
}
export function saveData(
  data: Data,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("day-finance-receipts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("blobs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("เปิดที่เก็บสลิปไม่ได้"));
  });
}
export async function putReceipt(blobId: string, blob: Blob) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(blob, blobId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("บันทึกสลิปไม่สำเร็จ"));
      tx.onabort = () => reject(new Error("ยกเลิกการบันทึกสลิป"));
    });
  } finally {
    db.close();
  }
}
export async function getReceipt(blobId: string): Promise<Blob> {
  const db = await openDB();
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const req = db.transaction("blobs").objectStore("blobs").get(blobId);
      req.onsuccess = () =>
        req.result
          ? resolve(req.result)
          : reject(new Error("ไม่พบไฟล์สลิปในอุปกรณ์นี้"));
      req.onerror = () => reject(new Error("อ่านสลิปไม่สำเร็จ"));
    });
  } finally {
    db.close();
  }
}
export async function deleteReceipt(blobId: string) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").delete(blobId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("ลบไฟล์ไม่สำเร็จ"));
    });
  } finally {
    db.close();
  }
}
export async function persistTransaction(
  data: Data,
  tx: Transaction,
  file?: File,
  storage: Pick<Storage, "setItem"> = localStorage,
): Promise<Data> {
  const next = addTransaction(data, tx);
  if (next === data) return data;
  let receipt: Receipt | undefined;
  if (file) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("รองรับ JPG, PNG, WebP ขนาดไม่เกิน 5 MB");
    receipt = {
      receiptId: id(),
      transactionId: tx.transactionId,
      blobId: id(),
      fileName: file.name,
      createdAt: new Date().toISOString(),
    };
    await putReceipt(receipt.blobId, file);
    next.receipts = [...next.receipts, receipt];
  }
  try {
    saveData(next, storage);
  } catch (error) {
    if (receipt) await deleteReceipt(receipt.blobId).catch(() => {});
    throw error;
  }
  return next;
}

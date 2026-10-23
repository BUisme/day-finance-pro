import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import {
  deleteReceipt,
  getReceipt,
  loadData,
  persistTransaction,
  saveData,
  STORAGE_KEY,
} from "../src/storage";
import { createSeed } from "../src/seed";
import type { Transaction } from "../src/models";
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
const transaction: Transaction = {
  transactionId: "receipt-tx",
  txDate: "2026-10-01",
  monthId: "2026-10",
  type: "expense",
  amountMinor: 100,
  fromWalletId: "bank",
  categoryId: "food",
  status: "posted",
};
describe("local persistence", () => {
  it("seeds once and reloads edited user data", () => {
    const store = memory(),
      d = loadData(store);
    d.wallets[0].name = "บัญชีของฉัน";
    saveData(d, store);
    expect(loadData(store)).toEqual(d);
    expect(loadData(store).wallets[0].name).toBe("บัญชีของฉัน");
  });
  it("does not overwrite malformed existing data", () => {
    const store = memory();
    store.setItem(STORAGE_KEY, "broken");
    expect(() => loadData(store)).toThrow();
    expect(store.getItem(STORAGE_KEY)).toBe("broken");
  });
  it("stores receipt blobs in IndexedDB and only references in localStorage", async () => {
    const store = memory(),
      file = new File(["image-data"], "slip.png", { type: "image/png" });
    const d = await persistTransaction(
      { ...createSeed(), transactions: [] },
      transaction,
      file,
      store,
    );
    const receipt = d.receipts[0];
    expect(receipt.fileName).toBe("slip.png");
    expect((await getReceipt(receipt.blobId)).size).toBe(file.size);
    expect(loadData(store).receipts[0].blobId).toBe(receipt.blobId);
    expect(store.getItem(STORAGE_KEY)).not.toContain("image-data");
    await deleteReceipt(receipt.blobId);
    await expect(getReceipt(receipt.blobId)).rejects.toThrow();
  });
  it("does not save a transaction when IndexedDB fails", async () => {
    const store = memory();
    const spy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      await expect(
        persistTransaction(
          { ...createSeed(), transactions: [] },
          transaction,
          new File(["x"], "x.png", { type: "image/png" }),
          store,
        ),
      ).rejects.toThrow("blocked");
      expect(store.getItem(STORAGE_KEY)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
  it("reports localStorage quota failure without claiming success", async () => {
    await expect(
      persistTransaction(
        { ...createSeed(), transactions: [] },
        transaction,
        undefined,
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
      ),
    ).rejects.toThrow("quota");
  });
});

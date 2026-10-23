import { test, expect } from "@playwright/test";
async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("four pages, plan, wallets, debt schedules and responsive widths", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: "/tmp/day-finance-dashboard.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "สรุปการเงิน." }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "แก้ไขแผน" }).click();
  await page.getByLabel("รายรับสุทธิตามแผน (บาท)").fill("55000");
  await page.getByRole("button", { name: "บันทึกแผน" }).click();
  await expect(page.locator(".hero-card>.amount")).toContainText("18,000.00");
  await page.getByRole("button", { name: "กระเป๋า", exact: true }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "เพิ่มกระเป๋า", exact: true }).click();
  await page.getByLabel("ชื่อกระเป๋า").fill("ทดสอบเงินสด");
  await page.getByLabel("ยอดตั้งต้น (บาท)").fill("100");
  await page.getByRole("button", { name: "บันทึกกระเป๋า" }).click();
  await expect(
    page.getByRole("heading", { name: "ทดสอบเงินสด" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "แก้ไข ทดสอบเงินสด" }).click();
  await page.getByLabel("ชื่อกระเป๋า").fill("กระเป๋าใหม่");
  await page.getByRole("button", { name: "บันทึกกระเป๋า" }).click();
  await expect(
    page.getByRole("heading", { name: "กระเป๋าใหม่" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "หนี้", exact: true }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "เพิ่มหนี้", exact: true }).click();
  await page.getByLabel("ชื่อหนี้").fill("หนี้ทดสอบ");
  await page.getByLabel("จำนวนงวด").fill("2");
  await page.getByLabel("ยอดต่องวด (บาท)").fill("200");
  await page.getByRole("button", { name: "สร้าง / แทนที่ตารางงวด" }).click();
  await page.getByLabel("ยอดงวด 2", { exact: true }).fill("300");
  await page.getByRole("button", { name: "บันทึกหนี้และตารางงวด" }).click();
  await expect(
    page.getByRole("heading", { name: "หนี้ทดสอบ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  await expect(page.locator(".tx-row")).toHaveCount(4);
  await page.getByRole("button", { name: "รายรับ", exact: true }).click();
  await expect(page.locator(".tx-row")).toHaveCount(1);
  await page.getByLabel("เลือกเดือน").fill("2020-01");
  await expect(page.locator(".tx-row")).toHaveCount(0);
  await noOverflow(page);
  for (const width of [390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  await page.reload();
  await page.getByRole("button", { name: "กระเป๋า", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "กระเป๋าใหม่" }),
  ).toBeVisible();
});
test("submit duplicate protection, transfer validation, receipt and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();
  await page.getByLabel("จำนวนเงิน (บาท)").fill("12.34");
  await page.getByLabel("รายละเอียด (ไม่บังคับ)").fill("รายการทดสอบพร้อมสลิป");
  await page
    .getByLabel("แนบสลิป", { exact: false })
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .evaluate((node: HTMLButtonElement) => {
      node.click();
      node.click();
    });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  await page.getByLabel("ค้นหารายการ").fill("รายการทดสอบพร้อมสลิป");
  await expect(page.locator(".tx-row")).toHaveCount(1);
  await page.getByRole("button", { name: "ดูสลิป", exact: true }).click();
  await expect(page.locator(".receipt-image")).toBeVisible();
  expect(
    await page
      .locator(".receipt-image")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "ปิด", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  await page.getByLabel("ค้นหารายการ").fill("รายการทดสอบพร้อมสลิป");
  await expect(page.locator(".tx-row")).toHaveCount(1);
  await page.getByRole("button", { name: "ดูสลิป", exact: true }).click();
  await expect(page.locator(".receipt-image")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "โอนเงิน", exact: true })
    .click();
  await page.getByLabel("จำนวนเงิน (บาท)").fill("100");
  await page.getByLabel("กระเป๋าปลายทาง", { exact: true }).selectOption("bank");
  await page.getByRole("button", { name: "บันทึกรายการ", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ต่างกัน");
  await noOverflow(page);
  await page
    .getByLabel("กระเป๋าปลายทาง", { exact: true })
    .selectOption("saving");
  await page.getByRole("button", { name: "บันทึกรายการ", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("partial debt payment updates outstanding exactly once", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();
  await page.getByRole("button", { name: "จ่ายหนี้", exact: true }).click();
  await page.getByLabel("จำนวนเงิน (บาท)").fill("1000");
  await page.getByLabel("หนี้ / งวดที่ชำระ").selectOption("car-0");
  await page.getByRole("button", { name: "บันทึกรายการ", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "หนี้", exact: true }).click();
  await expect(page.locator(".debt-stats")).toContainText("5,000.00");
  await expect(page.locator(".installment")).toContainText("ชำระบางส่วน");
  await expect(page.locator(".installment")).toContainText("5,000.00");
  await page.screenshot({
    path: "/tmp/day-finance-mobile.png",
    fullPage: true,
  });
});

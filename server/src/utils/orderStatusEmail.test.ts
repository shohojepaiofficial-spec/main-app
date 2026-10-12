import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findById: vi.fn(), sendEmail: vi.fn() }));
vi.mock("../models/Order", () => ({ Order: { findById: mocks.findById } }));
vi.mock("./sendEmail", () => ({ sendEmail: mocks.sendEmail }));

import { buildOrderStatusEmail, notifyOrderStatus, OrderEmailData } from "./orderStatusEmail";

const data = (extra: Partial<OrderEmailData> = {}): OrderEmailData => ({
  orderId: "665f1f77bcf86cd7994a1b2c", customerName: "Rahim", paymentMethod: "cod", totalAmount: 1500,
  items: [{ name: "Blue Shirt", quantity: 2, variantLabel: "L" }], ...extra,
});
const stored = (extra: Record<string, unknown> = {}) => ({
  id: "665f1f77bcf86cd7994a1b2c", user: { name: "Rahim", email: "rahim@example.com" }, paymentMethod: "cod", totalAmount: 1500,
  items: [{ product: { name: "Blue Shirt" }, quantity: 2, variantLabel: "L" }, { product: null, quantity: 1 }], ...extra,
});
const query = (order: unknown) => { const chain = { select: () => chain, populate: () => chain, then: (resolve: (value: unknown) => void) => resolve(order) }; return chain; };
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => vi.resetAllMocks());

describe("order status email content", () => {
  it("names the order, the items and the total for every event", () => {
    for (const event of ["placed", "paid", "shipped", "delivered", "cancelled"] as const) {
      const email = buildOrderStatusEmail(event, data());
      expect(email.subject).toContain("#4A1B2C");
      expect(email.text).toContain("Blue Shirt (L) × 2");
      expect(email.text).toContain("৳1,500");
      expect(email.html).toContain("/orders");
    }
  });
  it("tells a cash-on-delivery customer what to pay and an online customer the payment arrived", () => {
    expect(buildOrderStatusEmail("placed", data()).text).toContain("in cash when it is delivered");
    expect(buildOrderStatusEmail("shipped", data()).text).toContain("ready to pay on delivery");
    expect(buildOrderStatusEmail("shipped", data({ paymentMethod: "bkash" })).text).not.toContain("pay on delivery");
    expect(buildOrderStatusEmail("paid", data()).subject).toContain("is confirmed");
    expect(buildOrderStatusEmail("paid", data({ paymentMethod: "bkash" })).subject).toContain("Payment received");
  });
  it("explains an unpaid online cancellation differently from a paid one", () => {
    const unpaid = buildOrderStatusEmail("cancelled", data({ paymentMethod: "bkash", previousStatus: "pending" }));
    expect(unpaid.text).toContain("didn't receive a payment");
    const paid = buildOrderStatusEmail("cancelled", data({ paymentMethod: "bkash", previousStatus: "paid", paymentReceived: true }));
    expect(paid.text).toContain("refunding your payment");
    expect(buildOrderStatusEmail("cancelled", data()).text).not.toContain("refund");
  });
  it("mentions the pre-order ship date and the return window", () => {
    expect(buildOrderStatusEmail("placed", data({ isPreorder: true, expectedShipDate: new Date("2026-11-05T00:00:00Z") })).text).toContain("ships around 5 November 2026");
    expect(buildOrderStatusEmail("delivered", data()).text).toContain("within 7 days");
  });
  it("escapes customer and product text in the HTML and never names the courier", () => {
    const email = buildOrderStatusEmail("shipped", data({ customerName: "<script>x</script>", items: [{ name: "A & <b>B</b>", quantity: 1 }] }));
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("A &amp; &lt;b&gt;B&lt;/b&gt;");
    expect(`${email.subject}${email.text}`.toLowerCase()).not.toContain("pathao");
  });
});

describe("sending order status emails", () => {
  it("emails the account that placed the order", async () => {
    mocks.findById.mockReturnValue(query(stored()));
    notifyOrderStatus("665f1f77bcf86cd7994a1b2c", "shipped", "paid");
    await settled();
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0][0]).toMatchObject({ to: "rahim@example.com", subject: "Your order #4A1B2C is on its way" });
    expect(mocks.sendEmail.mock.calls[0][0].text).toContain("- Item × 1");
  });
  it("skips orders with no account and never throws when sending fails", async () => {
    mocks.findById.mockReturnValue(query(stored({ user: null })));
    notifyOrderStatus("665f1f77bcf86cd7994a1b2c", "placed");
    await settled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    mocks.findById.mockImplementation(() => { throw new Error("database down"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => notifyOrderStatus("665f1f77bcf86cd7994a1b2c", "placed")).not.toThrow();
    await settled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

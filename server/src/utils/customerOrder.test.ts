import { describe, it, expect } from "vitest";
import { customerOrderView } from "./customerOrder";

const stored = {
  _id: "o1",
  user: "u1",
  items: [{ product: { _id: "p1", name: "Towel" }, quantity: 2, price: 200 }],
  itemsTotal: 400,
  deliveryFee: 60,
  discount: 0,
  totalAmount: 460,
  status: "shipped",
  paymentMethod: "bkash",
  shippingAddress: { fullName: "Buyer", phone: "01700000000", zila: "Dhaka", upazila: "Dhaka", addressLine: "Test street" },
  statusHistory: [{ status: "pending", at: new Date("2026-10-01") }, { status: "paid", at: new Date("2026-10-02"), by: "staff1", byName: "Staff Name" }],
  createdAt: new Date("2026-10-01"),
  internalNote: "customer is rude on the phone",
  courierProvider: "pathao",
  courierConsignmentId: "DX123",
  courierTrackingStatus: "In transit",
  courierNote: "second attempt",
  courierBookedAt: new Date("2026-10-02"),
  paymentReviewRequired: true,
  paymentReviewNote: "amount mismatch",
  paymentReviewResolvedAt: new Date("2026-10-02"),
  paymentReviewResolvedBy: "admin1",
  lastPaymentCheckAt: new Date("2026-10-02"),
  bkashPaymentID: "P1",
  bkashTrxID: "T1",
  bkashRedirectUrl: "https://bkash.example/pay",
  idempotencyKey: "same-key-123456789",
  requestFingerprint: "abc",
  reservationExpiresAt: new Date("2026-10-01"),
  source: "online",
  sharedCartId: "c1",
  deliveryFeeSource: "pathao",
};

describe("customerOrderView", () => {
  it("keeps what the customer's pages show", () => {
    const view = customerOrderView(stored);
    expect(view).toMatchObject({ _id: "o1", totalAmount: 460, status: "shipped", paymentMethod: "bkash" });
    expect(view.items).toBe(stored.items);
    expect(view.shippingAddress).toBe(stored.shippingAddress);
    // Who moved the order is staff-only.
    expect(view.statusHistory).toEqual([{ status: "pending", at: new Date("2026-10-01") }, { status: "paid", at: new Date("2026-10-02") }]);
  });

  it("drops every staff-only and internal field", () => {
    const view = customerOrderView(stored);
    expect(Object.keys(view).sort()).toEqual(
      ["_id", "createdAt", "deliveryFee", "discount", "items", "itemsTotal", "paymentMethod", "shippingAddress", "status", "statusHistory", "totalAmount", "user"]
    );
  });

  it("reads a Mongoose document through toObject", () => {
    const view = customerOrderView({ toObject: () => stored });
    expect(view._id).toBe("o1");
    expect(view).not.toHaveProperty("internalNote");
  });
});

import { describe, expect, it } from "vitest";
import { describePaymentIssue } from "./paymentIssues";

describe("describePaymentIssue", () => {
  it("never offers to reopen a cancelled order that was paid — refund and dismiss", () => {
    expect(describePaymentIssue({ status: "cancelled", bkashTrxID: "T1", paymentReviewRequired: true })).toMatchObject({ kind: "paid_but_cancelled", allowed: ["dismiss"] });
  });
  it("lets a stuck pending payment be confirmed or cancelled", () => {
    expect(describePaymentIssue({ status: "pending", bkashPaymentID: "P1", paymentReviewRequired: true }).allowed).toEqual(["paid", "cancelled"]);
    expect(describePaymentIssue({ status: "pending", paymentReviewRequired: false }).kind).toBe("stale_reservation");
  });
  it("only dismisses a mismatch on an order that's already moving", () => {
    expect(describePaymentIssue({ status: "paid", bkashTrxID: "T1", paymentReviewRequired: true }).allowed).toEqual(["dismiss"]);
  });
});

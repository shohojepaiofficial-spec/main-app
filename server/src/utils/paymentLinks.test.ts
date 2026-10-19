import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { cartIdFromPaymentLink, paymentLink } from "./paymentLinks";

beforeEach(() => { vi.stubEnv("JWT_SECRET", "payment-link-test-secret"); });

describe("payment links (SEC-21)", () => {
  const id = new Types.ObjectId().toString();

  it("reads back the cart id from a link it made", () => {
    const link = paymentLink(id);
    expect(link.startsWith(`${id}-`)).toBe(true);
    expect(cartIdFromPaymentLink(link)).toBe(id);
  });

  it("refuses a bare cart id, a forged signature and another cart's signature", () => {
    const link = paymentLink(id);
    const other = new Types.ObjectId().toString();
    expect(cartIdFromPaymentLink(id)).toBeNull();
    expect(cartIdFromPaymentLink(`${id}-${"A".repeat(32)}`)).toBeNull();
    expect(cartIdFromPaymentLink(`${other}${link.slice(24)}`)).toBeNull();
    expect(cartIdFromPaymentLink(link.slice(0, -1))).toBeNull();
    expect(cartIdFromPaymentLink(undefined)).toBeNull();
  });

  it("stops working when the server secret changes", () => {
    const link = paymentLink(id);
    vi.stubEnv("JWT_SECRET", "a-different-secret");
    expect(cartIdFromPaymentLink(link)).toBeNull();
  });
});

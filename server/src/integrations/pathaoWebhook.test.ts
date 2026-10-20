import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { pathaoSignatureScheme, readPathaoWebhook, storeStatusFor, verifyPathaoSignature } from "./pathaoWebhook";

afterEach(() => vi.unstubAllEnvs());

describe("Pathao webhook", () => {
  it("accepts the shared secret or an HMAC of the body, nothing else", () => {
    vi.stubEnv("PATHAO_WEBHOOK_SECRET", "s3cret");
    const body = Buffer.from('{"consignment_id":"DL1"}');
    expect(verifyPathaoSignature("s3cret", body)).toBe(true);
    expect(verifyPathaoSignature(createHmac("sha256", "s3cret").update(body).digest("hex"), body)).toBe(true);
    expect(verifyPathaoSignature("wrong", body)).toBe(false);
    expect(verifyPathaoSignature(undefined, body)).toBe(false);
    vi.stubEnv("PATHAO_WEBHOOK_SECRET", "");
    expect(verifyPathaoSignature("", body)).toBe(false);
  });

  it("refuses the other form once PATHAO_WEBHOOK_SIGNATURE pins one (SEC-24)", () => {
    vi.stubEnv("PATHAO_WEBHOOK_SECRET", "s3cret");
    const body = Buffer.from('{"consignment_id":"DL1"}');
    const hmac = createHmac("sha256", "s3cret").update(body).digest("hex");
    vi.stubEnv("PATHAO_WEBHOOK_SIGNATURE", "hmac");
    expect(pathaoSignatureScheme("s3cret", body)).toBeNull();
    expect(pathaoSignatureScheme(hmac, body)).toBe("hmac");
    vi.stubEnv("PATHAO_WEBHOOK_SIGNATURE", "secret");
    expect(pathaoSignatureScheme("s3cret", body)).toBe("secret");
    expect(pathaoSignatureScheme(hmac, body)).toBeNull();
    vi.stubEnv("PATHAO_WEBHOOK_SIGNATURE", "");
  });
  it("reads the status from order_status or the event name", () => {
    expect(readPathaoWebhook({ consignment_id: "DL1", order_status: "Pickup", event: "order.picked" })).toEqual({ consignmentId: "DL1", merchantOrderId: undefined, status: "Pickup" });
    expect(readPathaoWebhook({ merchant_order_id: "abc", event: "order.out-for-delivery" })?.status).toBe("out for delivery");
    expect(readPathaoWebhook({ event: "webhook_integration" })).toBeNull();
    expect(readPathaoWebhook("nope")).toBeNull();
  });
  it("maps only clear statuses to store statuses", () => {
    expect(storeStatusFor("Picked")).toBe("shipped");
    expect(storeStatusFor("In Transit")).toBe("shipped");
    expect(storeStatusFor("Out For Delivery")).toBe("shipped");
    expect(storeStatusFor("Delivered")).toBe("delivered");
    for (const s of ["Partial Delivery", "Returned", "Delivery Failed", "On Hold", "Pending"]) expect(storeStatusFor(s)).toBeNull();
  });
});

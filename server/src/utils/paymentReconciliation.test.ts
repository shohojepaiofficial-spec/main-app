import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../models/Order", () => ({ Order: { updateOne: vi.fn().mockResolvedValue({}) } }));
vi.mock("./orderTransitions", () => ({ transitionOrder: vi.fn() }));
import { Order } from "../models/Order";
import { transitionOrder } from "./orderTransitions";
import { reconcilePayment } from "./paymentReconciliation";
const order = { _id: "order", id: "order", totalAmount: 100 } as unknown as InstanceType<typeof Order>;
beforeEach(() => { vi.clearAllMocks(); vi.mocked(transitionOrder).mockResolvedValue({} as never); });
describe("payment reconciliation", () => {
  it("holds unknown or initiated payments without releasing inventory", async () => {
    expect(await reconcilePayment(order, { transactionStatus: "Initiated" })).toBe("pending");
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(Order.updateOne).toHaveBeenCalledWith({ _id: "order" }, { $set: { paymentReviewRequired: true } });
  });
  it("does not accept a success with mismatched amount", async () => {
    expect(await reconcilePayment(order, { transactionStatus: "Completed", amount: "1", trxID: "trx" })).toBe("error");
    expect(transitionOrder).not.toHaveBeenCalled();
  });
  it("records a successful payment through the conditional transition", async () => {
    expect(await reconcilePayment(order, { transactionStatus: "Completed", amount: "100.00", trxID: "trx" })).toBe("success");
    expect(transitionOrder).toHaveBeenCalledWith("order", "paid", { pendingOnly: true, transactionId: "trx" });
  });
  it("flags a late payment instead of reopening released inventory", async () => {
    vi.mocked(transitionOrder).mockRejectedValue({ status: 409 });
    expect(await reconcilePayment(order, { transactionStatus: "Completed", amount: "100", trxID: "trx" })).toBe("error");
    expect(Order.updateOne).toHaveBeenCalledWith({ _id: "order" }, { $set: { paymentReviewRequired: true, bkashTrxID: "trx" } });
  });
  it("releases only a definitively failed payment", async () => {
    await reconcilePayment(order, { transactionStatus: "Failed" });
    expect(transitionOrder).toHaveBeenCalledWith("order", "cancelled", { pendingOnly: true, paymentFailed: true });
  });
});

import { describe, expect, it } from "vitest";
import { suggestedRefund, toReturnRequestInput, type ReturnFormState } from "./returns";

const base: ReturnFormState = { type: "return", reason: "damaged", details: "  cracked ", exchangeFor: "", quantities: [1, 0] };

describe("toReturnRequestInput", () => {
  it("sends only picked lines, trimmed", () => {
    expect(toReturnRequestInput("o1", base, [1, 2])).toEqual({
      input: { orderId: "o1", type: "return", reason: "damaged", details: "cracked", exchangeFor: undefined, items: [{ orderItemIndex: 0, quantity: 1 }] },
    });
  });
  it("explains what's missing", () => {
    expect(toReturnRequestInput("o1", { ...base, quantities: [0, 0] }, [1, 2])).toEqual({ error: "Pick at least one item" });
    expect(toReturnRequestInput("o1", { ...base, quantities: [2, 0] }, [1, 2])).toEqual({ error: "You've picked more than you can return" });
    expect(toReturnRequestInput("o1", { ...base, reason: "" }, [1, 2])).toEqual({ error: "Choose a reason" });
    expect(toReturnRequestInput("o1", { ...base, type: "exchange" }, [1, 2])).toEqual({ error: "Tell us what you'd like instead" });
  });
});

describe("suggestedRefund", () => {
  it("defaults to the items' value, capped by what's left on the order", () => {
    expect(suggestedRefund(1200, 5000)).toBe(1200);
    expect(suggestedRefund(1200, 800)).toBe(800);
    expect(suggestedRefund(1200, 0)).toBe(0);
  });
});

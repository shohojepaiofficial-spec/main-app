import { describe, it, expect } from "vitest";
import { normalizePreorderInput, preorderUpdate, preorderSpotsLeft } from "./preorder";

describe("normalizePreorderInput", () => {
  it("parses the admin form's JSON", () => {
    expect(
      normalizePreorderInput(
        JSON.stringify({ enabled: true, shipDate: "2026-11-15", limit: "50", codDiscountPercent: "5", onlineDiscountPercent: 10 })
      )
    ).toEqual({
      enabled: true,
      shipDate: new Date("2026-11-15"),
      limit: 50,
      codDiscountPercent: 5,
      onlineDiscountPercent: 10,
    });
  });

  it("treats blank limit, date and discounts as none", () => {
    expect(normalizePreorderInput({ enabled: false, shipDate: "", limit: "", codDiscountPercent: "" })).toEqual({
      enabled: false,
      codDiscountPercent: 0,
      onlineDiscountPercent: 0,
    });
  });

  it("rejects a discount over 90%, a bad limit and a bad date", () => {
    expect(() => normalizePreorderInput({ codDiscountPercent: 95 })).toThrow();
    expect(() => normalizePreorderInput({ limit: 2.5 })).toThrow();
    expect(() => normalizePreorderInput({ shipDate: "not a date" })).toThrow();
    expect(() => normalizePreorderInput("{oops")).toThrow();
  });
});

describe("preorderUpdate", () => {
  it("starts the reserved count again when pre-order is switched on", () => {
    const { $set } = preorderUpdate({ enabled: true, codDiscountPercent: 0, onlineDiscountPercent: 0 }, false);
    expect($set["preorder.reserved"]).toBe(0);
  });

  it("leaves the reserved count alone while pre-order stays on, and clears a removed limit/date", () => {
    const { $set, $unset } = preorderUpdate({ enabled: true, codDiscountPercent: 0, onlineDiscountPercent: 0 }, true);
    expect($set).not.toHaveProperty("preorder.reserved");
    expect($unset).toEqual({ "preorder.shipDate": "", "preorder.limit": "" });
  });
});

describe("preorderSpotsLeft", () => {
  it("is unlimited without a cap and never negative with one", () => {
    expect(preorderSpotsLeft({ reserved: 5 })).toBe(Infinity);
    expect(preorderSpotsLeft({ limit: 10, reserved: 4 })).toBe(6);
    expect(preorderSpotsLeft({ limit: 3, reserved: 5 })).toBe(0);
  });
});

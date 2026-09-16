import { describe, it, expect } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats a whole number with two decimal places and the Taka symbol", () => {
    expect(formatCurrency(200)).toBe("৳200.00");
  });

  it("formats a fractional amount", () => {
    expect(formatCurrency(199.5)).toBe("৳199.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("৳0.00");
  });
});

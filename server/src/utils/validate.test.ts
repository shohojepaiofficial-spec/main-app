import { describe, expect, it } from "vitest";
import { isValidPersonName, safePersonName } from "./validate";

describe("person names", () => {
  it("accepts real names, including Bangla", () => {
    for (const name of ["Rahim Uddin", "মাহফুজ আহমেদ", "Dr. A. K. M. Hasan", "O'Neil"]) expect(isValidPersonName(name)).toBe(true);
  });
  it("refuses markup, links and very long names", () => {
    for (const name of ["", "   ", "<a href=x>Win</a>", "Claim at https://evil.example", "visit www.evil", "go to evil.com now", "x".repeat(81)]) {
      expect(isValidPersonName(name)).toBe(false);
    }
  });
  it("keeps the safe part of a Google name, or falls back", () => {
    expect(safePersonName("  Rahim <b>Uddin</b> ", "Customer")).toBe("Rahim bUddin/b");
    expect(safePersonName("Free money at evil.com", "Customer")).toBe("Customer");
    expect(safePersonName("", "Customer")).toBe("Customer");
  });
});

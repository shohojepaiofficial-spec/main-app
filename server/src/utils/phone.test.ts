import { describe, expect, it } from "vitest";
import { isBdMobile, normalizeBdPhone } from "./phone";

describe("Bangladeshi phone numbers", () => {
  it("stores every spelling of one number the same way", () => {
    for (const phone of ["01712345678", "01712-345678", "+8801712345678", "8801712345678", "1712345678", " 017 1234 5678 "]) {
      expect(normalizeBdPhone(phone)).toBe("01712345678");
      expect(isBdMobile(phone)).toBe(true);
    }
  });
  it("rejects anything that isn't a mobile number", () => {
    for (const phone of ["", "12345", "0121234567", "01212345678", "017123456789", "abc"]) expect(isBdMobile(phone)).toBe(false);
  });
});

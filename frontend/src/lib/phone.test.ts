import { describe, expect, it } from "vitest";
import { isBdMobile } from "./phone";

describe("isBdMobile", () => {
  it("accepts any spelling of a Bangladeshi mobile number", () => {
    for (const phone of ["01712345678", "01712-345678", "+8801712345678", "1712345678"]) expect(isBdMobile(phone)).toBe(true);
  });
  it("rejects anything else", () => {
    for (const phone of ["", "123456", "01212345678", "017123456789"]) expect(isBdMobile(phone)).toBe(false);
  });
});

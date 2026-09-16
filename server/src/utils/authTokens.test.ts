import { describe, it, expect } from "vitest";
import { generateRawAndHash, hashToken } from "./authTokens";

describe("authTokens", () => {
  it("produces a hash that matches hashToken(raw)", () => {
    const { raw, hash } = generateRawAndHash();
    expect(hashToken(raw)).toBe(hash);
  });

  it("never returns the raw token as the stored hash", () => {
    const { raw, hash } = generateRawAndHash();
    expect(hash).not.toBe(raw);
  });

  it("generates a different raw token every call", () => {
    const a = generateRawAndHash();
    const b = generateRawAndHash();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it("hashToken is deterministic", () => {
    expect(hashToken("same-input")).toBe(hashToken("same-input"));
  });
});

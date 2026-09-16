import { describe, it, expect } from "vitest";
import { isPermission, PERMISSIONS } from "./permissions";

describe("isPermission", () => {
  it("accepts every value in the real permissions list", () => {
    for (const p of PERMISSIONS) {
      expect(isPermission(p)).toBe(true);
    }
  });

  it("rejects an unknown string", () => {
    expect(isPermission("orders:delete-everything")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isPermission(undefined)).toBe(false);
    expect(isPermission(null)).toBe(false);
    expect(isPermission(42)).toBe(false);
  });

  it("never allows granting full admin as a delegable permission", () => {
    // A coadmin's permissions array is validated against this same list —
    // "admin" must never sneak into it (see docs/ARCHITECTURE.md's
    // single-admin invariant).
    expect(PERMISSIONS as readonly string[]).not.toContain("admin");
  });
});

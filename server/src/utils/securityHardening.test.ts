import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { sanitizeImage } from "./upload";
import { encryptSecret, decryptSecret } from "./secretEncryption";
import { validNewPassword } from "./passwordPolicy";
import { checkoutSchema, parseInput, cartFingerprint } from "./checkoutValidation";
import { assertSafeInput, productInput, requestValidation } from "../middleware/requestValidation";
import { validateControllerInput } from "../middleware/controllerInput";
import type { Request, Response } from "express";

beforeEach(() => {
  vi.stubEnv("TOTP_ENCRYPTION_KEY_ID", "one");
  vi.stubEnv("TOTP_ENCRYPTION_KEYS", JSON.stringify({ one: Buffer.alloc(32, 1).toString("base64"), two: Buffer.alloc(32, 2).toString("base64") }));
});
afterEach(() => vi.unstubAllEnvs());

describe("security input boundaries", () => {
  const line = { productId: "507f1f77bcf86cd799439011", quantity: 1 };
  const checkout = { items: [line], shippingAddress: { fullName: "Buyer", phone: "01700000000", zila: "Dhaka", upazila: "Dhaka", addressLine: "Test address" } };
  it("accepts bounded checkout and rejects unknown fields, duplicates and excessive carts", () => {
    expect(parseInput(checkoutSchema, checkout).items).toHaveLength(1);
    for (const invalid of [{ ...checkout, totalAmount: 1 }, { ...checkout, items: [line, line] }, { ...checkout, items: Array(51).fill(line) }, { ...checkout, items: [{ ...line, quantity: 1000 }] }, { ...checkout, shippingAddress: { ...checkout.shippingAddress, fullName: {} } }]) {
      expect(() => parseInput(checkoutSchema, invalid)).toThrow();
    }
  });
  it("compares shared carts independently of line order", () => {
    const second = { ...line, productId: "507f1f77bcf86cd799439012" };
    expect(cartFingerprint([line, second])).toBe(cartFingerprint([second, line]));
    expect(cartFingerprint([line])).not.toBe(cartFingerprint([{ ...line, quantity: 2 }]));
  });
  it.each([{ $set: { stock: 10 } }, { "preorder.reserved": 10 }, JSON.parse('{"__proto__":{"admin":true}}'), { options: [{ $where: "true" }] }])("rejects unsafe keys before queries", input => expect(() => assertSafeInput(input)).toThrow());
  it("allowlists product writes and rejects scalar coercion attacks", () => {
    expect(productInput({ price: "10", stock: "2", name: "Test" })).toMatchObject({ price: 10, stock: 2 });
    for (const input of [{ name: [] }, { price: {} }, { createdAt: "today" }, { options: '[{"$where":"x"}]' }, { existingImages: '{}' }, { preorder: { enabled: true, reserved: 10 } }]) expect(() => productInput(input)).toThrow();
  });
  it("rejects invalid IDs and unknown profile fields", () => {
    expect(() => validateControllerInput("updateProfile", { body: { role: "admin" } } as Request)).toThrow();
    expect(() => validateControllerInput("getProductById", { params: { id: "bad" } } as unknown as Request)).toThrow();
    expect(() => validateControllerInput("updateUserAccess", { body: { permissions: {} } } as Request)).toThrow();
  });
  it("rejects operator and repeated query parameters", () => {
    for (const query of [{ search: { $ne: "" } }, { page: "10001" }, { search: ["a", "b"] }]) {
      const next = vi.fn();
      requestValidation({ query } as unknown as Request, {} as Response, next);
      expect(next.mock.calls[0][0]).toMatchObject({ status: 400 });
    }
  });
});

describe("image contents", () => {
  it("decodes and re-encodes actual image content", async () => {
    const png = await sharp({ create: { width: 5, height: 5, channels: 3, background: "red" } }).png().toBuffer();
    const encoded = await sanitizeImage(png);
    expect((await sharp(encoded).metadata()).format).toBe("webp");
  });
  it.each([Buffer.from("<script>evil()</script>"), Buffer.from("GIF89a"), Buffer.alloc(5 * 1024 * 1024 + 1)])("rejects forged, truncated or oversized images", async bytes => {
    await expect(sanitizeImage(bytes)).rejects.toMatchObject({ status: 400 });
  });
});

describe("secret encryption and password policy", () => {
  it("uses randomized authenticated encryption and supports retained rotation keys", () => {
    const one = encryptSecret("SECRET");
    expect(one).not.toContain("SECRET");
    expect(encryptSecret("SECRET")).not.toBe(one);
    vi.stubEnv("TOTP_ENCRYPTION_KEY_ID", "two");
    expect(decryptSecret(one)).toBe("SECRET");
    expect(decryptSecret(encryptSecret("NEW"))).toBe("NEW");
    expect(() => decryptSecret(one.replace(":one:", ":two:"))).toThrow();
    expect(() => decryptSecret(one.slice(0, -2) + "AA")).toThrow();
  });
  it("fails closed without a valid key", () => { vi.stubEnv("TOTP_ENCRYPTION_KEYS", "{}"); expect(() => encryptSecret("secret")).toThrow(); });
  it("requires an explicit migration flag for production plaintext", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => decryptSecret("LEGACY")).toThrow();
    vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "true");
    expect(decryptSecret("LEGACY")).toBe("LEGACY");
  });
  it("bounds UTF-8 bytes before bcrypt truncation", () => {
    expect(validNewPassword("a".repeat(12))).toBe(true);
    expect(validNewPassword("a".repeat(11))).toBe(false);
    expect(validNewPassword("a".repeat(73))).toBe(false);
    expect(validNewPassword("😀".repeat(19))).toBe(false);
  });
});

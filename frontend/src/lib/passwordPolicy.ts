import { z } from "zod";

// Same rule as server/src/utils/passwordPolicy.ts: 12+ characters, and at
// most 72 bytes (bcrypt's limit) — shown to customers only as "too long".
export const newPasswordSchema = z
  .string()
  .refine((value) => [...value].length >= 12, "Password must be at least 12 characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password is too long — please use a shorter one");

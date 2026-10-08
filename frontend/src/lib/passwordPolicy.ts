import { z } from "zod";
export const newPasswordSchema = z.string().refine(value => [...value].length >= 12 && new TextEncoder().encode(value).length <= 72, "Use at least 12 characters and at most 72 UTF-8 bytes");

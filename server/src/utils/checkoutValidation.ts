import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const cartItems = z.array(z.object({
  productId: objectId, variantId: objectId.optional(), quantity: z.number().int().min(1).max(100),
}).strict()).min(1).max(50).superRefine((items, ctx) => {
  const keys = items.map(i => `${i.productId}:${i.variantId ?? ""}`);
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", message: "Duplicate cart lines" });
});
const text = (max: number) => z.string().trim().min(1).max(max);
export const checkoutSchema = z.object({
  items: cartItems,
  shippingAddress: z.object({ fullName: text(120), phone: text(40), zila: text(100), upazila: text(100), addressLine: text(500) }).strict(),
  promoCode: z.string().max(80).optional(), sharedCartId: objectId.optional(),
  paymentMethod: z.enum(["cod", "bkash"]).optional(),
}).strict();

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw Object.assign(new Error(result.error.issues[0]?.message ?? "Invalid request"), { status: 400 });
  return result.data;
}

export function cartFingerprint(items: z.infer<typeof cartItems>) {
  return JSON.stringify(items.map(i => [i.productId.toLowerCase(), i.variantId?.toLowerCase() ?? "", i.quantity]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

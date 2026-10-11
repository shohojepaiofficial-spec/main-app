import { z } from "zod";
import { objectId } from "./checkoutValidation";
import { RETURN_REASONS, RETURN_TYPES, REFUND_METHODS } from "../models/ReturnRequest";

// Request bodies for the returns (WORK-08) and payment reconciliation
// (WORK-11) endpoints, checked by middleware/controllerInput.ts before the
// handler reads anything.
const optionalText = (max: number) => z.string().trim().max(max).optional();
const money = z.number().finite().min(1).max(10_000_000);

const createReturn = z.object({
  orderId: objectId,
  type: z.enum(RETURN_TYPES),
  reason: z.enum(RETURN_REASONS),
  details: optionalText(2000),
  exchangeFor: optionalText(200),
  items: z.array(z.object({
    orderItemIndex: z.number().int().min(0).max(49),
    quantity: z.number().int().min(1).max(100),
  }).strict()).min(1).max(50),
}).strict();

export const returnInputs: Record<string, z.ZodTypeAny> = {
  createReturnRequest: createReturn,
  adminCreateReturnRequest: createReturn,
  updateReturnStatus: z.object({
    status: z.enum(["approved", "rejected", "received", "completed"]),
    customerMessage: optionalText(1000),
    staffNote: optionalText(2000),
    restock: z.boolean().optional(),
    replacementOrderId: objectId.optional(),
  }).strict(),
  recordRefund: z.object({
    amount: money,
    method: z.enum(REFUND_METHODS).exclude(["bkash"]),
    reference: optionalText(200),
    note: optionalText(1000),
  }).strict(),
  refundWithBkash: z.object({
    amount: money,
    reason: optionalText(255),
  }).strict(),
  resolvePaymentReview: z.object({
    outcome: z.enum(["paid", "cancelled", "dismiss"]),
    note: z.string().trim().min(3, "Add a short note").max(1000),
    transactionId: z.string().trim().min(4).max(100).optional(),
  }).strict(),
  recheckPayment: z.object({}).strict(),
};

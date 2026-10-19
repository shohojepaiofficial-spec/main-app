import { Router } from "express";
import { createSharedCart, getSharedCart, payForSharedCart } from "../controllers/sharedCartController";
import { protect } from "../middleware/auth";
import { checkoutIpLimiter, checkoutAccountLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/", checkoutIpLimiter, protect, checkoutAccountLimiter, createSharedCart);
// Public, so `:link` is the signed payment link, never a bare cart id
// (utils/paymentLinks.ts). The payer needs no account; rate-limited like checkout.
router.get("/:link", getSharedCart);
router.post("/:link/pay", checkoutIpLimiter, payForSharedCart);

export default router;

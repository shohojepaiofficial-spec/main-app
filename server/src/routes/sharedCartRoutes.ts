import { Router } from "express";
import { createSharedCart, getSharedCart, payForSharedCart } from "../controllers/sharedCartController";
import { protect } from "../middleware/auth";
import { checkoutIpLimiter, checkoutAccountLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/", checkoutIpLimiter, protect, checkoutAccountLimiter, createSharedCart);
router.get("/:id", getSharedCart);
// Public: the payer needs no account. Rate-limited like checkout.
router.post("/:id/pay", checkoutIpLimiter, payForSharedCart);

export default router;

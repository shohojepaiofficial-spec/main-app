import { Router } from "express";
import { createSharedCart, getSharedCart } from "../controllers/sharedCartController";
import { protect } from "../middleware/auth";
import { checkoutIpLimiter, checkoutAccountLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/", checkoutIpLimiter, protect, checkoutAccountLimiter, createSharedCart);
router.get("/:id", getSharedCart);

export default router;

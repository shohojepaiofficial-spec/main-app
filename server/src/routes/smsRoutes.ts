import { Router } from "express";
import { getBalance } from "../controllers/smsController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// orders:manage — order status SMS is what spends the balance, and it's the
// same audience as the dashboard overview's Orders section.
router.get("/balance", protect, authorize("orders:manage"), getBalance);

export default router;

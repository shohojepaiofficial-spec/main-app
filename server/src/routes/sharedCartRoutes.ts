import { Router } from "express";
import { createSharedCart, getSharedCart } from "../controllers/sharedCartController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/", protect, createSharedCart);
router.get("/:id", getSharedCart);

export default router;

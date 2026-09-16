import { Router } from "express";
import { getUsers, updateUserAccess } from "../controllers/userController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/", protect, adminOnly, getUsers);
router.patch("/:id/access", protect, adminOnly, updateUserAccess);

export default router;

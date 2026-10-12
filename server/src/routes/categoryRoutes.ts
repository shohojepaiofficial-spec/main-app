import { Router } from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  moveCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";
import { adminUploadLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageProducts = authorize("products:manage");

// Staff only. The storefront's list of categories that have products is
// the public GET /api/products/categories.
router.get("/", protect, canManageProducts, getAllCategories);
router.post("/", protect, canManageProducts, adminUploadLimiter, upload.single("image"), createCategory);
router.put("/:id", protect, canManageProducts, adminUploadLimiter, upload.single("image"), updateCategory);
router.patch("/:id/move", protect, canManageProducts, moveCategory);
router.delete("/:id", protect, canManageProducts, deleteCategory);

export default router;

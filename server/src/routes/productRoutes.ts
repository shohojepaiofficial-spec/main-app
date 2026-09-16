import { Router } from "express";
import {
  getProducts,
  getProductCategories,
  getProductStats,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { getProductReviews, submitReview, deleteReview } from "../controllers/reviewController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";

const router = Router();
const canManageProducts = authorize("products:manage");
const canManageReviews = authorize("reviews:manage");

router.get("/", getProducts);
router.get("/categories", getProductCategories);
router.get("/stats", protect, canManageProducts, getProductStats);
router.get("/:id", getProductById);
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", protect, submitReview);
router.delete("/:id/reviews/:reviewId", protect, canManageReviews, deleteReview);
router.post("/", protect, canManageProducts, upload.array("images", 5), createProduct);
router.put("/:id", protect, canManageProducts, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, canManageProducts, deleteProduct);

export default router;

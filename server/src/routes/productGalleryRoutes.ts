import { Router } from "express";
import {
  uploadGalleryImages,
  listGalleryImages,
  updateGalleryImageTags,
  deleteGalleryImage,
  createGalleryShare,
  getGalleryShare,
} from "../controllers/productGalleryController";
import { protect, authorize } from "../middleware/auth";
import { adminUploadLimiter } from "../middleware/rateLimit";
import { galleryUpload } from "../utils/upload";

const router = Router();
const canManageProducts = authorize("products:manage");

router.get("/products/:id/gallery", protect, canManageProducts, listGalleryImages);
router.post("/products/:id/gallery", protect, canManageProducts, adminUploadLimiter, galleryUpload.array("images", 30), uploadGalleryImages);
router.patch("/products/:id/gallery/:imageId", protect, canManageProducts, updateGalleryImageTags);
router.delete("/products/:id/gallery/:imageId", protect, canManageProducts, deleteGalleryImage);
router.post("/products/:id/gallery/share", protect, canManageProducts, createGalleryShare);
// Public, so `:link` is the signed share link, never a bare share id
// (utils/galleryShareLinks.ts). No account needed to view selected photos.
router.get("/gallery-shares/:link", getGalleryShare);

export default router;

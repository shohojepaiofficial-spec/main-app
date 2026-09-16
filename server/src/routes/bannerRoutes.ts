import { Router } from "express";
import {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  moveBanner,
  deleteBanner,
} from "../controllers/bannerController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";

const router = Router();
const canManageBanners = authorize("banners:manage");

router.get("/", getBanners);
router.get("/all", protect, canManageBanners, getAllBanners);
router.post("/", protect, canManageBanners, upload.single("image"), createBanner);
router.put("/:id", protect, canManageBanners, upload.single("image"), updateBanner);
router.patch("/:id/move", protect, canManageBanners, moveBanner);
router.delete("/:id", protect, canManageBanners, deleteBanner);

export default router;

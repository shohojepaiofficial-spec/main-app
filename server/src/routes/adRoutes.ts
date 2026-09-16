import { Router } from "express";
import { getAds, createAd, publishAd, deleteAd } from "../controllers/adController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";

const router = Router();
const canManageAds = authorize("ads:manage");

router.get("/", protect, canManageAds, getAds);
router.post("/", protect, canManageAds, upload.single("image"), createAd);
router.post("/:id/publish", protect, canManageAds, publishAd);
router.delete("/:id", protect, canManageAds, deleteAd);

export default router;

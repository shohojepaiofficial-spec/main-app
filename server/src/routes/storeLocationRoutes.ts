import { Router } from "express";
import {
  getStoreLocations,
  getAllStoreLocations,
  createStoreLocation,
  updateStoreLocation,
  moveStoreLocation,
  deleteStoreLocation,
} from "../controllers/storeLocationController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";
import { adminUploadLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageLocations = authorize("locations:manage");

router.get("/", getStoreLocations);
router.get("/all", protect, canManageLocations, getAllStoreLocations);
router.post("/", protect, canManageLocations, adminUploadLimiter, upload.array("images"), createStoreLocation);
router.put("/:id", protect, canManageLocations, adminUploadLimiter, upload.array("images"), updateStoreLocation);
router.patch("/:id/move", protect, canManageLocations, moveStoreLocation);
router.delete("/:id", protect, canManageLocations, deleteStoreLocation);

export default router;

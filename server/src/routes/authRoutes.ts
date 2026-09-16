import { Router } from "express";
import {
  register,
  login,
  oauthSync,
  getMe,
  updateProfile,
  changePassword,
  updateDeliveryLocation,
  updateMarketingOptIn,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  unsubscribeFromMarketing,
} from "../controllers/authController";
import { requireInternalSecret } from "../middleware/internalAuth";
import { protect } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { upload } from "../utils/upload";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);
router.patch("/profile", protect, upload.single("image"), updateProfile);
router.patch("/password", protect, changePassword);
router.patch("/delivery-location", protect, updateDeliveryLocation);
router.patch("/marketing-opt-in", protect, updateMarketingOptIn);
router.post("/oauth-sync", requireInternalSecret, oauthSync);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", protect, authLimiter, resendVerificationEmail);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/unsubscribe", unsubscribeFromMarketing);

export default router;

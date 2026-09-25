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
import {
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
} from "../controllers/twoFactorController";
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

// Two-step verification (admin/co-admin only — see twoFactorController.ts).
// `verify-login` is deliberately public + rate-limited, same as login
// itself: it's the second half of signing in, called before a real session
// exists, authenticated by the short-lived tempToken in its body instead.
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/confirm", protect, confirmTwoFactor);
router.post("/2fa/disable", protect, disableTwoFactor);
router.post("/2fa/verify-login", authLimiter, verifyTwoFactorLogin);

export default router;

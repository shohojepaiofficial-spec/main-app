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
  refreshSession,
  logoutSession,
  logoutAllSessions,
} from "../controllers/authController";
import {
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
  replaceTwoFactor,
  confirmTwoFactorReplacement,
} from "../controllers/twoFactorController";
import { listSessions, revokeSessionById } from "../controllers/sessionController";
import { requireInternalSecret } from "../middleware/internalAuth";
import { protect } from "../middleware/auth";
import { authLimiter, authTargetLimiter, profileUploadLimiter, twoFactorManagementLimiter, twoFactorLoginLimiter, sessionRefreshLimiter } from "../middleware/rateLimit";
import { upload } from "../utils/upload";
import { auditTrail } from "../middleware/auditTrail";

// Staff account-security events for the change history. Customers pass
// through untouched; nothing secret (codes, passwords) is recorded.
const auditAccount = (field: string, before: string | undefined, after: string) =>
  auditTrail({
    entityType: "account",
    action: "updated",
    target: { from: "self" },
    changes: () => [{ field, ...(before ? { before } : {}), after }],
  });
const auditProfile = auditTrail({ entityType: "account", action: "updated", target: { from: "self" } });

const router = Router();

router.post("/register", authLimiter, authTargetLimiter, register);
router.post("/login", authLimiter, authTargetLimiter, login);
router.post("/refresh", sessionRefreshLimiter, refreshSession);
router.post("/logout", protect, logoutSession);
router.post("/logout-all", protect, auditAccount("sessions", undefined, "Signed out on all devices"), logoutAllSessions);
router.get("/sessions", protect, listSessions);
router.delete("/sessions/:sid", protect, auditAccount("sessions", undefined, "Signed out one device"), revokeSessionById);
router.get("/me", protect, getMe);
router.patch("/profile", protect, profileUploadLimiter, upload.single("image"), auditProfile, updateProfile);
router.patch("/password", protect, auditAccount("password", undefined, "Changed"), changePassword);
router.patch("/delivery-location", protect, updateDeliveryLocation);
router.patch("/marketing-opt-in", protect, updateMarketingOptIn);
router.post("/oauth-sync", requireInternalSecret, oauthSync);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", protect, authLimiter, resendVerificationEmail);
router.post("/forgot-password", authLimiter, authTargetLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
// A POST from the button on /unsubscribe, never a GET: email link scanners
// open links, and opening one must not change anything.
router.post("/unsubscribe", authLimiter, unsubscribeFromMarketing);

// Two-step verification (admin/co-admin only — see twoFactorController.ts).
// `verify-login` is deliberately public + rate-limited, same as login
// itself: it's the second half of signing in, called before a real session
// exists, authenticated by the short-lived tempToken in its body instead.
router.post("/2fa/setup", protect, twoFactorManagementLimiter, setupTwoFactor);
router.post("/2fa/confirm", protect, twoFactorManagementLimiter, auditAccount("twoStepVerification", "Off", "On"), confirmTwoFactor);
router.post("/2fa/replace", protect, twoFactorManagementLimiter, replaceTwoFactor);
router.post("/2fa/replace/confirm", protect, twoFactorManagementLimiter, auditAccount("authenticatorApp", undefined, "Replaced"), confirmTwoFactorReplacement);
router.post("/2fa/disable", protect, twoFactorManagementLimiter, auditAccount("twoStepVerification", "On", "Off"), disableTwoFactor);
router.post("/2fa/verify-login", authLimiter, twoFactorLoginLimiter, verifyTwoFactorLogin);

export default router;

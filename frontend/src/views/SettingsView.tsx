"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAuthController } from "@/controllers/useAuthController";
import { useAuthStore } from "@/controllers/useAuthStore";
import * as authService from "@/services/authService";
import { toUploadUrl } from "@/lib/api";
import { ZilaUpazilaFields } from "@/views/ZilaUpazilaFields";
import { BANGLADESH_ZILAS } from "@/lib/bangladeshGeo";
import { useTranslations } from "@/controllers/useTranslations";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const profileSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  phone: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileSection() {
  const { user } = useAuthController();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [image, setImage] = useState<File | null>(null);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);

  if (!user) return null;

  const avatarSrc = imagePreview ?? (user.image ? toUploadUrl(user.image) : null);
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSubmit = async (values: ProfileValues) => {
    try {
      const updated = await authService.updateProfile({
        name: values.name,
        phone: values.phone,
        image: image ?? undefined,
      });
      updateUser(updated);
      setImage(null);
      toast.success(t("settings.profileUpdated", "Profile updated"));
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.failedToUpdateProfile", "Failed to update profile")));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold">{t("settings.profile", "Profile")}</h2>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-normal text-primary-foreground">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={user.name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <p className="mt-1 text-xs text-muted">{t("settings.squareImagesWorkBest", "Square images work best.")}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("settings.name", "Name")}</label>
        <input
          {...register("name")}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">{t("checkout.phone", "Phone")}</label>
        <input
          {...register("phone")}
          type="tel"
          placeholder={t("settings.phonePlaceholder", "e.g. 01XXXXXXXXX")}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        <p className="mt-1 text-xs text-muted">
          {t("settings.phoneHint", "Used as your default contact number at checkout.")}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">{t("settings.email", "Email")}</label>
        <input
          value={user.email}
          disabled
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-muted"
        />
        <p className="mt-1 text-xs text-muted">
          {t("settings.emailCantBeChanged", "Email can't be changed here.")}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("settings.saving", "Saving...") : t("settings.saveChanges", "Save changes")}
      </button>
    </form>
  );
}

const deliveryLocationSchema = z.object({
  zila: z.string().min(1, "Pick a Zila"),
  upazila: z.string().min(1, "Pick an Upazila"),
  addressLine: z.string().min(5, "Address is too short"),
});
type DeliveryLocationValues = z.infer<typeof deliveryLocationSchema>;

function DeliveryLocationSection() {
  const { user } = useAuthController();
  const updateUser = useAuthStore((s) => s.updateUser);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryLocationValues>({
    resolver: zodResolver(deliveryLocationSchema),
    defaultValues: {
      zila: user?.deliveryLocation?.zila ?? "",
      upazila: user?.deliveryLocation?.upazila ?? "",
      addressLine: user?.deliveryLocation?.addressLine ?? "",
    },
  });

  const zila = useWatch({ control, name: "zila" });
  const upazila = useWatch({ control, name: "upazila" });

  // Clear a now-invalid Upazila when Zila changes to something whose list
  // doesn't include it — but not on first render, where the saved pair is
  // already valid together.
  useEffect(() => {
    if (!zila || !upazila) return;
    const valid = BANGLADESH_ZILAS.find((z) => z.zila === zila)?.upazilas.includes(upazila);
    if (!valid) setValue("upazila", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zila]);

  const onSubmit = async (values: DeliveryLocationValues) => {
    try {
      const updated = await authService.updateDeliveryLocation(values);
      updateUser(updated);
      toast.success(t("settings.deliveryLocationSaved", "Delivery location saved"));
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.failedToSaveDeliveryLocation", "Failed to save delivery location")));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
    >
      <div>
        <h2 className="text-sm font-semibold">{t("dashboard.deliveryLocation", "Delivery location")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t(
            "settings.deliveryLocationHint",
            "Used at checkout and to show your dashboard the right delivery fee for products you're looking at."
          )}
        </p>
      </div>

      <ZilaUpazilaFields
        zilaRegister={register("zila")}
        upazilaRegister={register("upazila")}
        selectedZila={zila}
        zilaError={errors.zila?.message}
        upazilaError={errors.upazila?.message}
      />

      <div>
        <label className="text-sm font-medium">{t("checkout.houseRoadArea", "House / Road / Area")}</label>
        <textarea
          {...register("addressLine")}
          rows={2}
          placeholder={t("checkout.houseRoadAreaPlaceholder", "House no., road, area...")}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.addressLine && (
          <p className="mt-1 text-sm text-red-600">{errors.addressLine.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("settings.saving", "Saving...") : t("settings.saveLocation", "Save location")}
      </button>
    </form>
  );
}

function MarketingSection() {
  const { user } = useAuthController();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [savingField, setSavingField] = useState<"email" | "sms" | null>(null);
  const { t } = useTranslations();

  if (!user) return null;

  const optIn = user.marketingOptIn ?? { email: false, sms: false };

  const onToggle = async (field: "email" | "sms", checked: boolean) => {
    if (field === "sms" && checked && !user.phone) {
      toast.error(t("settings.addPhoneForSms", "Add a phone number above before enabling SMS updates"));
      return;
    }
    setSavingField(field);
    try {
      const updated = await authService.updateMarketingOptIn({ [field]: checked });
      updateUser(updated);
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.failedToUpdatePreferences", "Failed to update preferences")));
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">{t("settings.promotions", "Promotions")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t(
            "settings.promotionsHint",
            "Off by default — opt in to hear about sales, new arrivals, and promo codes."
          )}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={optIn.email}
          disabled={savingField === "email"}
          onChange={(e) => onToggle("email", e.target.checked)}
        />
        {t("settings.emailMeAboutPromotions", "Email me about promotions")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={optIn.sms}
          disabled={savingField === "sms" || !user.phone}
          onChange={(e) => onToggle("sms", e.target.checked)}
        />
        {t("settings.textMeAboutPromotions", "Text me about promotions")}
        {!user.phone && (
          <span className="text-xs text-muted">
            {t("settings.addPhoneFirst", "(add a phone number above first)")}
          </span>
        )}
      </label>
    </div>
  );
}

// Only ever shown to admin/coadmin accounts (see the section's render check
// in SettingsView below) — matches the backend's own eligibility check in
// twoFactorController.ts#assertEligible. Renders one of four inline steps
// rather than separate modals, since each step's contents (QR code, backup
// codes, a disable confirmation) briefly needs their own inputs but never
// enough that navigating away and back makes sense.
type TwoFactorStep =
  | { name: "idle" }
  | { name: "settingUp"; secret: string; qrCodeDataUrl: string }
  | { name: "backupCodes"; codes: string[] }
  | { name: "disabling" };

function TwoFactorSection() {
  const { user } = useAuthController();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [step, setStep] = useState<TwoFactorStep>({ name: "idle" });
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslations();

  if (!user) return null;

  const startSetup = async () => {
    setIsSubmitting(true);
    try {
      const data = await authService.setupTwoFactor();
      setStep({ name: "settingUp", secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
      setCode("");
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.failedToStart2fa", "Failed to start setup")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSetup = async () => {
    setIsSubmitting(true);
    try {
      const data = await authService.confirmTwoFactor(code.trim());
      updateUser({ ...user, twoFactorEnabled: true });
      setStep({ name: "backupCodes", codes: data.backupCodes });
      setCode("");
      toast.success(t("settings.twoFactorEnabled", "Two-step verification enabled"));
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.invalidCode", "That code didn't match — try again")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDisable = async () => {
    setIsSubmitting(true);
    try {
      await authService.disableTwoFactor(code.trim());
      updateUser({ ...user, twoFactorEnabled: false });
      setStep({ name: "idle" });
      setCode("");
      toast.success(t("settings.twoFactorDisabled", "Two-step verification disabled"));
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.invalidCode", "That code didn't match — try again")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = () => {
    setStep({ name: "idle" });
    setCode("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">{t("settings.twoFactor", "Two-step verification")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t(
            "settings.twoFactorHint",
            "Require a code from an authenticator app (Google Authenticator, Authy, etc.) when signing in."
          )}
        </p>
      </div>

      {step.name === "idle" && (
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {user.twoFactorEnabled
              ? t("settings.twoFactorStatusOn", "Enabled")
              : t("settings.twoFactorStatusOff", "Disabled")}
          </span>
          {user.twoFactorEnabled ? (
            <button
              onClick={() => setStep({ name: "disabling" })}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-background"
            >
              {t("settings.disable", "Disable")}
            </button>
          ) : (
            <button
              onClick={startSetup}
              disabled={isSubmitting}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {t("settings.enable", "Enable")}
            </button>
          )}
        </div>
      )}

      {step.name === "settingUp" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t(
              "settings.twoFactorScanQr",
              "Scan this QR code with your authenticator app, then enter the 6-digit code it shows."
            )}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a base64 data URI, not a servable file next/image could optimize */}
          <img src={step.qrCodeDataUrl} alt="Two-step verification QR code" className="h-40 w-40 self-center" />
          <p className="break-all text-center text-xs text-muted">{step.secret}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("settings.sixDigitCode", "123456")}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmSetup}
              disabled={isSubmitting || !code.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? t("settings.verifying", "Verifying...") : t("settings.confirmAndEnable", "Confirm and enable")}
            </button>
            <button
              onClick={cancel}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
            >
              {t("settings.cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {step.name === "backupCodes" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-red-600">
            {t(
              "settings.backupCodesWarning",
              "Save these backup codes now — this is the only time they're shown. Each one works once, if you ever lose access to your authenticator app."
            )}
          </p>
          <div className="grid grid-cols-2 gap-2 rounded border border-border bg-background p-3 font-mono text-sm">
            {step.codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <button
            onClick={() => setStep({ name: "idle" })}
            className="self-start rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            {t("settings.savedTheseCodes", "I've saved these codes")}
          </button>
        </div>
      )}

      {step.name === "disabling" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t(
              "settings.twoFactorDisableInstructions",
              "Enter a current 6-digit code, or one of your backup codes, to confirm."
            )}
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("settings.twoFactorCodePlaceholder", "123456 or XXXXX-XXXXX")}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmDisable}
              disabled={isSubmitting || !code.trim()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? t("settings.verifying", "Verifying...") : t("settings.confirmDisable", "Confirm disable")}
            </button>
            <button
              onClick={cancel}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
            >
              {t("settings.cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { t } = useTranslations();

  const onSubmit = async (values: PasswordValues) => {
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      toast.success(t("auth.passwordUpdated", "Password updated"));
      reset();
    } catch (err) {
      toast.error(extractErrorMessage(err, t("settings.failedToUpdatePassword", "Failed to update password")));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold">{t("settings.password", "Password")}</h2>

      <div>
        <label className="text-sm font-medium">{t("settings.currentPassword", "Current password")}</label>
        <input
          {...register("currentPassword")}
          type="password"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.currentPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">{t("auth.newPassword", "New password")}</label>
        <input
          {...register("newPassword")}
          type="password"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">{t("auth.confirmNewPassword", "Confirm new password")}</label>
        <input
          {...register("confirmPassword")}
          type="password"
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("auth.updating", "Updating...") : t("auth.updatePassword", "Update password")}
      </button>
    </form>
  );
}

export function SettingsView() {
  const { user } = useAuthController();
  const { t } = useTranslations();
  if (!user) return null;

  return (
    <main className="max-w-xl p-6">
      <h1 className="mb-1 text-xl font-semibold">{t("nav.settings", "Settings")}</h1>
      <p className="mb-6 text-sm text-muted">
        {t("settings.manageProfileAndSecurity", "Manage your profile and account security.")}
      </p>

      <div className="flex flex-col gap-6">
        <ProfileSection />
        <DeliveryLocationSection />
        <MarketingSection />
        {(user.role === "admin" || user.role === "coadmin") && <TwoFactorSection />}
        {user.provider === "google" ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
            {t("settings.signedInWithGoogle", "You signed in with Google, so there's no password to manage here.")}
          </div>
        ) : (
          <PasswordSection />
        )}
      </div>
    </main>
  );
}

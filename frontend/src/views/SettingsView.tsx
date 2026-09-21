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

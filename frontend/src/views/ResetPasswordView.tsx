"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useAuthStore } from "@/controllers/useAuthStore";
import * as authService from "@/services/authService";
import { useTranslations } from "@/controllers/useTranslations";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type Values = z.infer<typeof schema>;

export function ResetPasswordView({ token }: { token: string | null }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isDone, setIsDone] = useState(false);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    if (!token) return;
    try {
      const data = await authService.resetPassword(token, values.password);
      setAuth(data.token, data.user);
      setIsDone(true);
      toast.success(t("auth.passwordUpdated", "Password updated"));
    } catch (err) {
      toast.error(extractErrorMessage(err, t("auth.failedToResetPassword", "Failed to reset password")));
    }
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
        <h1 className="mb-1 text-xl font-semibold">{t("auth.invalidLink", "Invalid link")}</h1>
        <p className="text-sm text-muted">
          {t(
            "auth.resetLinkMissingToken",
            "This password reset link is missing its token — copy the full link from your email."
          )}
        </p>
      </main>
    );
  }

  if (isDone) {
    return (
      <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="mb-1 text-xl font-semibold">{t("auth.passwordUpdated", "Password updated")}</h1>
        <p className="mb-4 text-sm text-muted">
          {t("auth.signedInPickUp", "You're signed in — pick up where you left off.")}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {t("auth.goToDashboard", "Go to your dashboard")}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <KeyRound size={28} className="mx-auto mb-3 text-primary" />
      <h1 className="mb-1 text-center text-xl font-semibold">{t("auth.chooseNewPassword", "Choose a new password")}</h1>
      <p className="mb-6 text-center text-sm text-muted">
        {t("auth.atLeast6Chars", "Make it at least 6 characters — you'll be signed in right after.")}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">{t("auth.newPassword", "New password")}</label>
          <input
            {...register("password")}
            type="password"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
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
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? t("auth.updating", "Updating...") : t("auth.updatePassword", "Update password")}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        <Link href="/" className="underline hover:text-foreground">
          {t("auth.backToTheStore", "Back to the store")}
        </Link>
      </p>
    </main>
  );
}

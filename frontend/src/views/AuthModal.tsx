"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useUIStore } from "@/controllers/useUIStore";
import { useAuthStore } from "@/controllers/useAuthStore";
import {
  loginWithEmail,
  registerWithEmail,
  forgotPassword,
  verifyTwoFactorLogin,
} from "@/services/authService";
import { useTranslations } from "@/controllers/useTranslations";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name is too short"),
});

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const twoFactorSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code, or a backup code"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;
type TwoFactorValues = z.infer<typeof twoFactorSchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function OAuthButtons() {
  // Return to whatever page prompted the login (e.g. checkout) instead of
  // always dropping the user back on the homepage.
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-2 mt-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: pathname })}
        className="flex items-center justify-center gap-2 border border-border rounded-md py-2 text-sm font-normal hover:bg-background"
      >
        {t("auth.continueWithGoogle", "Continue with Google")}
      </button>
    </div>
  );
}

function LoginForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);
  const openTwoFactorChallenge = useUIStore((s) => s.openTwoFactorChallenge);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    try {
      const data = await loginWithEmail(values.email, values.password);
      if ("twoFactorRequired" in data) {
        openTwoFactorChallenge(data.tempToken);
        return;
      }
      setAuth(data.token, data.user);
      toast.success(t("auth.loggedIn", "Logged in"));
      closeAuthModal();
    } catch (err) {
      toast.error(extractErrorMessage(err, t("auth.loginFailed", "Login failed")));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder={t("auth.email", "Email")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <input
          {...register("password")}
          type="password"
          placeholder={t("auth.password", "Password")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setMode("forgot")}
        className="self-end text-xs text-muted underline hover:text-foreground"
      >
        {t("auth.forgotPassword", "Forgot password?")}
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("auth.loggingIn", "Logging in...") : t("auth.logIn", "Log in")}
      </button>
      <p className="text-sm text-center text-muted">
        {t("auth.noAccount", "Don't have an account?")}{" "}
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="font-normal text-foreground underline"
        >
          {t("auth.signUp", "Sign up")}
        </button>
      </p>
    </form>
  );
}

function ForgotPasswordForm() {
  const setMode = useUIStore((s) => s.setAuthModalMode);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (values: ForgotValues) => {
    try {
      await forgotPassword(values.email);
    } catch {
      // The endpoint always responds the same way either way — a network
      // failure is the only realistic error here.
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm">
          {t(
            "auth.resetLinkSent",
            "If an account with that email exists, we've sent a link to reset your password."
          )}
        </p>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="text-sm font-normal text-foreground underline"
        >
          {t("auth.backToSignIn", "Back to sign in")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {t("auth.forgotPasswordInstructions", "Enter your account's email and we'll send a link to reset your password.")}
      </p>
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder={t("auth.email", "Email")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("auth.sending", "Sending...") : t("auth.sendResetLink", "Send reset link")}
      </button>
      <button
        type="button"
        onClick={() => setMode("login")}
        className="text-sm font-normal text-muted underline hover:text-foreground"
      >
        {t("auth.backToSignIn", "Back to sign in")}
      </button>
    </form>
  );
}

// The second step after a login/Google sign-in reports the account has
// two-step verification enabled (see LoginForm above and useOAuthBridge.ts)
// — exchanges the short-lived tempToken plus a code for a real session.
function TwoFactorForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);
  const tempToken = useUIStore((s) => s.twoFactorTempToken);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorValues>({ resolver: zodResolver(twoFactorSchema) });

  const onSubmit = async (values: TwoFactorValues) => {
    if (!tempToken) {
      toast.error(t("auth.twoFactorExpired", "This code has expired — please sign in again"));
      setMode("login");
      return;
    }
    try {
      const data = await verifyTwoFactorLogin(tempToken, values.code.trim());
      setAuth(data.token, data.user);
      toast.success(t("auth.loggedIn", "Logged in"));
      closeAuthModal();
    } catch (err) {
      toast.error(extractErrorMessage(err, t("auth.invalidCode", "Invalid code")));
    }
  };

  const onCancel = () => {
    // Covers both origins of a challenge: a local login (no NextAuth
    // session to worry about, so this is a harmless no-op) and a Google
    // sign-in (which does have a pending one) — same defensive
    // always-sign-out pattern useAuthController's logout() already uses.
    signOut({ redirect: false }).catch(() => {});
    closeAuthModal();
    setMode("login");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {t(
          "auth.twoFactorInstructions",
          "Enter the 6-digit code from your authenticator app, or one of your backup codes."
        )}
      </p>
      <div>
        <input
          {...register("code")}
          type="text"
          autoFocus
          placeholder={t("auth.twoFactorCodePlaceholder", "123456 or XXXXX-XXXXX")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("auth.verifying", "Verifying...") : t("auth.verify", "Verify")}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-normal text-muted underline hover:text-foreground"
      >
        {t("auth.backToSignIn", "Back to sign in")}
      </button>
    </form>
  );
}

function SignupForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);
  const { t } = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (values: SignupValues) => {
    try {
      const data = await registerWithEmail(values.name, values.email, values.password);
      setAuth(data.token, data.user);
      toast.success(t("auth.accountCreated", "Account created"));
      closeAuthModal();
    } catch (err) {
      toast.error(extractErrorMessage(err, t("auth.signUpFailed", "Sign up failed")));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <input
          {...register("name")}
          type="text"
          placeholder={t("checkout.fullName", "Full name")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder={t("auth.email", "Email")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <input
          {...register("password")}
          type="password"
          placeholder={t("auth.password", "Password")}
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.password && (
          <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? t("auth.creatingAccount", "Creating account...") : t("auth.signUp", "Sign up")}
      </button>
      <p className="text-sm text-center text-muted">
        {t("auth.alreadyHaveAccount", "Already have an account?")}{" "}
        <button
          type="button"
          onClick={() => setMode("login")}
          className="font-normal text-foreground underline"
        >
          {t("auth.logIn", "Log in")}
        </button>
      </p>
    </form>
  );
}

export function AuthModal() {
  const isOpen = useUIStore((s) => s.isAuthModalOpen);
  const mode = useUIStore((s) => s.authModalMode);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);
  const { t } = useTranslations();

  const showTabs = mode === "login" || mode === "signup";

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeAuthModal}
      title={mode === "twoFactor" ? t("auth.twoFactorTitle", "Two-step verification") : undefined}
    >
      {showTabs && (
        <div className="flex mb-4 border-b border-border">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 pb-2 text-sm font-normal border-b-2 ${
              mode === "login" ? "border-primary text-foreground" : "border-transparent text-muted"
            }`}
          >
            {t("nav.signIn", "Sign in")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 pb-2 text-sm font-normal border-b-2 ${
              mode === "signup" ? "border-primary text-foreground" : "border-transparent text-muted"
            }`}
          >
            {t("auth.signUp", "Sign up")}
          </button>
        </div>
      )}

      {mode === "login" && <LoginForm />}
      {mode === "signup" && <SignupForm />}
      {mode === "forgot" && <ForgotPasswordForm />}
      {mode === "twoFactor" && <TwoFactorForm />}

      {showTabs && (
        <>
          <div className="flex items-center gap-2 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">{t("auth.or", "OR")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <OAuthButtons />
        </>
      )}
    </Modal>
  );
}

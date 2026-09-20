"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useUIStore } from "@/controllers/useUIStore";
import { useAuthStore } from "@/controllers/useAuthStore";
import { loginWithEmail, registerWithEmail, forgotPassword } from "@/services/authService";

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

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function OAuthButtons() {
  // Return to whatever page prompted the login (e.g. checkout) instead of
  // always dropping the user back on the homepage.
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-2 mt-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: pathname })}
        className="flex items-center justify-center gap-2 border border-border rounded-md py-2 text-sm font-normal hover:bg-background"
      >
        Continue with Google
      </button>
    </div>
  );
}

function LoginForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    try {
      const data = await loginWithEmail(values.email, values.password);
      setAuth(data.token, data.user);
      toast.success("Logged in");
      closeAuthModal();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Login failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Email"
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <input
          {...register("password")}
          type="password"
          placeholder="Password"
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
        Forgot password?
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
      <p className="text-sm text-center text-muted">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="font-normal text-foreground underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

function ForgotPasswordForm() {
  const setMode = useUIStore((s) => s.setAuthModalMode);

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
          If an account with that email exists, we&apos;ve sent a link to reset your password.
        </p>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="text-sm font-normal text-foreground underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Enter your account&apos;s email and we&apos;ll send a link to reset your password.
      </p>
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Email"
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send reset link"}
      </button>
      <button
        type="button"
        onClick={() => setMode("login")}
        className="text-sm font-normal text-muted underline hover:text-foreground"
      >
        Back to sign in
      </button>
    </form>
  );
}

function SignupForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const setMode = useUIStore((s) => s.setAuthModalMode);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (values: SignupValues) => {
    try {
      const data = await registerWithEmail(values.name, values.email, values.password);
      setAuth(data.token, data.user);
      toast.success("Account created");
      closeAuthModal();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Sign up failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <input
          {...register("name")}
          type="text"
          placeholder="Full name"
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Email"
          className="w-full border border-border rounded px-3 py-2 bg-background"
        />
        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <input
          {...register("password")}
          type="password"
          placeholder="Password"
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
        {isSubmitting ? "Creating account..." : "Sign up"}
      </button>
      <p className="text-sm text-center text-muted">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setMode("login")}
          className="font-normal text-foreground underline"
        >
          Log in
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

  return (
    <Modal isOpen={isOpen} onClose={closeAuthModal}>
      {mode !== "forgot" && (
        <div className="flex mb-4 border-b border-border">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 pb-2 text-sm font-normal border-b-2 ${
              mode === "login" ? "border-primary text-foreground" : "border-transparent text-muted"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 pb-2 text-sm font-normal border-b-2 ${
              mode === "signup" ? "border-primary text-foreground" : "border-transparent text-muted"
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      {mode === "login" && <LoginForm />}
      {mode === "signup" && <SignupForm />}
      {mode === "forgot" && <ForgotPasswordForm />}

      {mode !== "forgot" && (
        <>
          <div className="flex items-center gap-2 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <OAuthButtons />
        </>
      )}
    </Modal>
  );
}

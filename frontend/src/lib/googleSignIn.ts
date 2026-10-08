import { signIn } from "next-auth/react";

// Request the URL first so errors/timeouts restore the form, and a late
// response cannot unexpectedly navigate after the user has retried.
export async function getGoogleSignInUrl(redirectTo: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      signIn("google", { redirect: false, redirectTo }, { prompt: "select_account" }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Google sign-in timed out")), 15_000);
      }),
    ]);
    if (!result || result.error || !result.ok || !result.url) {
      throw new Error("Google sign-in failed");
    }
    return result.url;
  } finally {
    clearTimeout(timer);
  }
}

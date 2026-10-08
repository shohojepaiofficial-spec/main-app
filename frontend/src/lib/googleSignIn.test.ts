import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
import { signIn } from "next-auth/react";
import { getGoogleSignInUrl } from "./googleSignIn";

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe("Google redirect", () => {
  it("opens account selection and preserves the return URL", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true, url: "https://accounts.google.com/example" } as never);
    await expect(getGoogleSignInUrl("/checkout?promo=SAVE")).resolves.toBe("https://accounts.google.com/example");
    expect(signIn).toHaveBeenCalledWith("google", { redirect: false, redirectTo: "/checkout?promo=SAVE" }, { prompt: "select_account" });
  });
  it("reports failed redirects", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true, error: "Configuration", url: null } as never);
    await expect(getGoogleSignInUrl("/")).rejects.toThrow("Google sign-in failed");
  });
  it("stops waiting after 15 seconds", async () => {
    vi.useFakeTimers();
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}));
    const result = expect(getGoogleSignInUrl("/")).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
  });
});

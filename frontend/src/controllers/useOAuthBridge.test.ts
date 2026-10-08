import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  handled: { current: null as string | null },
  auth: { token: null as string | null, setAuth: vi.fn() },
  ui: { twoFactorTempToken: null as string | null, openTwoFactorChallenge: vi.fn(), closeAuthModal: vi.fn(), openAuthModal: vi.fn() },
}));
vi.mock("react", () => ({ useEffect: (run: () => void) => run(), useRef: () => state.handled }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: state.session }), signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/controllers/useAuthStore", () => ({ useAuthStore: (select: (store: typeof state.auth) => unknown) => select(state.auth) }));
vi.mock("@/controllers/useUIStore", () => ({ useUIStore: Object.assign((select: (store: typeof state.ui) => unknown) => select(state.ui), { getState: () => state.ui }) }));
vi.mock("@/controllers/useTranslations", () => ({ translateNow: (_key: string, fallback: string) => fallback }));
import { useOAuthBridge } from "./useOAuthBridge";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

beforeEach(() => {
  vi.clearAllMocks();
  state.handled.current = null;
  state.auth.token = null;
  state.ui.twoFactorTempToken = null;
});

describe("OAuth session handoff", () => {
  it("opens a challenge once even after the modal is dismissed", () => {
    state.session = { twoFactorRequired: true, tempToken: "challenge" };
    useOAuthBridge();
    useOAuthBridge();
    expect(state.ui.openTwoFactorChallenge).toHaveBeenCalledExactlyOnceWith("challenge");
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(state.auth.setAuth).not.toHaveBeenCalled();
  });
  it("shows the local-login warning once and opens the login form", () => {
    state.session = { backendAuthError: "LOCAL_LOGIN_REQUIRED" };
    useOAuthBridge();
    useOAuthBridge();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("This email uses email and password sign-in. Please sign in with your password.");
    expect(state.ui.openAuthModal).toHaveBeenCalledWith("login");
    expect(state.auth.setAuth).not.toHaveBeenCalled();
  });
  it("redeems the server-held OAuth session and consumes the handoff", async () => {
    const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url")}.signature`;
    const user = { id: "test" };
    state.session = { backendToken: token, backendRefreshToken: "refresh-token", backendUser: user };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token, refreshToken: "refresh-token", user }) }));
    useOAuthBridge();
    useOAuthBridge();
    await vi.waitFor(() => expect(state.auth.setAuth).toHaveBeenCalledExactlyOnceWith(token, user, "refresh-token"));
    expect(state.ui.closeAuthModal).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });
});

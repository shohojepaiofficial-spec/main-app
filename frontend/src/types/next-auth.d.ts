import { User as AppUser } from "@/models";

// `next-auth`'s own `Session`/`JWT` re-exports (from "next-auth" and
// "next-auth/jwt") are `export * from "@auth/core/..."` — type-only
// re-exports, not real interface declarations — so augmenting those module
// specifiers doesn't merge with anything. The actual declarations live in
// "@auth/core/types" and "@auth/core/jwt"; augment those instead.
declare module "@auth/core/types" {
  interface Session {
    backendToken?: string;
    backendUser?: AppUser;
    // Set instead of backendToken/backendUser when oauth-sync reports the
    // account has two-step verification enabled — see useOAuthBridge.ts.
    twoFactorRequired?: boolean;
    tempToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    backendToken?: string;
    backendUser?: AppUser;
    twoFactorRequired?: boolean;
    tempToken?: string;
  }
}

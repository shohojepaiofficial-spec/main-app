import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google, Facebook],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    // Runs server-side right after a Google/Facebook sign-in. Exchanges the
    // OAuth identity for a real row in our MongoDB `users` collection and one
    // of our own JWTs, via a request only this server can make (internal
    // shared secret) — see server/src/controllers/authController.ts#oauthSync.
    async jwt({ token, account, profile, user }) {
      if (account && (account.provider === "google" || account.provider === "facebook")) {
        try {
          const res = await fetch(`${API_URL}/auth/oauth-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
            },
            body: JSON.stringify({
              name: user?.name ?? profile?.name,
              email: user?.email ?? profile?.email,
              provider: account.provider,
              providerId: account.providerAccountId,
              image: user?.image,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.token;
            token.backendUser = data.user;
          } else {
            console.error("oauth-sync failed:", res.status, await res.text());
          }
        } catch (err) {
          console.error("oauth-sync request failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.backendToken) session.backendToken = token.backendToken;
      if (token.backendUser) session.backendUser = token.backendUser;
      return session;
    },
  },
});

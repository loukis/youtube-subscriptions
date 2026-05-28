import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Token refresh failed");

  return {
    accessToken: data.access_token as string,
    // Google επιστρέφει expires_in σε δευτερόλεπτα → μετατρέπουμε σε Unix timestamp
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    // Νέο refresh token αν δοθεί, αλλιώς κρατάμε το παλιό
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/youtube.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Πρώτο login — αποθηκεύουμε όλα τα tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at, // Unix timestamp (seconds)
        };
      }

      // Token ακόμα έγκυρο (με 60s buffer για να αποφύγουμε edge cases)
      if (Date.now() < (token.expiresAt as number) * 1000 - 60_000) {
        return token;
      }

      // Token έληξε — ανανέωσε αυτόματα
      try {
        console.log("[auth] Access token expired, refreshing...");
        const refreshed = await refreshAccessToken(token.refreshToken as string);
        console.log("[auth] Token refreshed successfully");
        return { ...token, ...refreshed };
      } catch (error) {
        console.error("[auth] Token refresh failed:", error);
        // Επιστρέφουμε token με error flag — το session θα το δει
        return { ...token, error: "RefreshTokenError" };
      }
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      // Περνάμε το error στο session αν το refresh απέτυχε
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
});

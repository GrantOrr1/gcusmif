import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findAnalystByUsername, verifyPassword } from "@/lib/analysts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const analyst = findAnalystByUsername(username);
        if (!analyst) return null;

        const valid = await verifyPassword(password, analyst.passwordHash);
        if (!valid) return null;

        return { id: analyst.username, name: analyst.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
      }
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findAnalystByEmail, verifyPassword } from "@/lib/analysts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const analyst = findAnalystByEmail(email);
        if (!analyst) return null;

        const valid = await verifyPassword(password, analyst.passwordHash);
        if (!valid) return null;

        return { id: analyst.email, email: analyst.email, name: analyst.name };
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
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});

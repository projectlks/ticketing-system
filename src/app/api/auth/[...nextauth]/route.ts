// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 1 day
    updateAge: 60 * 15,   // 15 minutes
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) throw new Error("No user found");
        if (user.isArchived) throw new Error("Account is deleted or does not exist");

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error("Invalid password");

        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.profileUrl || null; // profile image
        token.name = user.name || null;
        token.email = user.email || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.picture = token.picture as string | null;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string | null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };

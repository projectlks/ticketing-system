import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt";

type AppRole = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "SUPER_ADMIN";
const GENERIC_AUTH_ERROR = "Invalid email or password.";
const DUMMY_PASSWORD_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8xjAnN0m4fP60Xj0R0hP5Kf6xk9bGa";


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

        if (!email || !password) throw new Error(GENERIC_AUTH_ERROR);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // User enumeration မဖြစ်စေဖို့ user မရှိတဲ့ case မှာလည်း bcrypt compare တူညီစွာလုပ်သည်။
        const comparedHash = user?.password ?? DUMMY_PASSWORD_HASH;
        const isValid = await bcrypt.compare(password, comparedHash);
        const isLoginAllowed = Boolean(user && !user.isArchived && isValid);

        if (!isLoginAllowed) throw new Error(GENERIC_AUTH_ERROR);



        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppRole;
        token.picture = user.profileUrl || null;
        token.name = user.name || null;
        token.email = user.email || null;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as AppRole | undefined) ?? "LEVEL_1";
        session.user.picture = token.picture as string | null;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string | null;
      } else {
        // Clear user completely if no token
        session.user.id = "";
        session.user.role = "";
        session.user.picture = "";
        session.user.name = "";
        session.user.email = "";
      }

      return session;
    },
  },




  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };

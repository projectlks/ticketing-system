import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
    updateAge: 60 * 15,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (!email || !password) throw new Error("Email and password required");

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
    async jwt ({ token, user }) {
        if (user) {
            token.id = user.id;
            token.role = user.role;
        }
        return token;
    },
    async session ({ session, token }) {
        if (token) {
            session.user.id = token.id as string;
            session.user.role = token.role as string;
        }
        return session;
    }
},
 
  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };


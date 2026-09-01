// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import CredentialsProvider from "next-auth/providers/credentials";
// import type { NextAuthOptions } from "next-auth";
// import bcrypt from "bcrypt";
// import { prisma } from "./prisma";

// type AppRole = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "SUPER_ADMIN";

// const AUTH_BASE_URL =
//   process.env.NEXTAUTH_URL ||
//   process.env.NEXT_PUBLIC_APP_URL ||
//   process.env.BASE_URL ||
//   "";
// const USE_SECURE_COOKIES = AUTH_BASE_URL.startsWith("https://");

// export const authOptions: NextAuthOptions = {
//   adapter: PrismaAdapter(prisma),
//   session: {
//     strategy: "jwt",
//   },
//   useSecureCookies: USE_SECURE_COOKIES,
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null;

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (!user || !user.password || user.isArchived) return null;

//         const isValid = await bcrypt.compare(credentials.password, user.password);
//         if (!isValid) return null;

//         return user;
//       },
//     }),
//   ],
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id;
//         token.role = user.role as AppRole;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.id as string;
//         session.user.role = (token.role as AppRole | undefined) ?? "LEVEL_1";
//       }
//       return session;
//     },
//   },
//   pages: {
//     signIn: "/auth/signin",
//   },
// };


import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { writeSystemLog } from "./logger"; // 🌟 Logger ကို ခေါ်ယူထားပါသည်

type AppRole = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "SUPER_ADMIN";

const AUTH_BASE_URL =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BASE_URL ||
  "";
const USE_SECURE_COOKIES = AUTH_BASE_URL.startsWith("https://");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  useSecureCookies: USE_SECURE_COOKIES,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // 🌟 Standard English Log (Blocked)
          writeSystemLog("security", "[LOGIN_BLOCKED] Authentication attempt blocked: Missing credentials.");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password || user.isArchived) {
          // 🌟 Standard English Log (Account Issue)
          writeSystemLog("security", `[LOGIN_FAILED] Authentication failed: User not found, missing password, or account is archived. (Email: ${credentials.email})`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          // 🌟 Standard English Log (Wrong Password)
          writeSystemLog("security", `[LOGIN_FAILED] Authentication failed: Invalid credentials provided. (Email: ${credentials.email})`);
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as AppRole | undefined) ?? "LEVEL_1";
      }
      return session;
    },
  },
  // 🌟 Login နှင့် Logout အောင်မြင်မှုများကို ဖမ်းမည့်အပိုင်း
  events: {
    async signIn({ user }) {
      writeSystemLog("security", `[LOGIN_SUCCESS] User authenticated successfully. (Email: ${user.email})`);
    },
    async signOut({ token }) {
      writeSystemLog("security", `[LOGOUT_SUCCESS] User session terminated successfully. (Email: ${token?.email || "Unknown"})`);
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
};
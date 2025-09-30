// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/libs/prisma";
import bcrypt from "bcrypt";

const MAX_SESSION_AGE_MS = 1000 * 60 * 60 * 24; // 1 day

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

      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) throw new Error("Email and password are required");

        const user = await prisma.user.findUnique({
          where: { email },
          include: { sessions: true },
        });

        if (!user || !user.password) throw new Error("No user found");
        if (user.isArchived) throw new Error("Account is deleted");

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error("Invalid password");

        const now = new Date();

        // heartbeat / keep-alive logic
        // const extendMs = HEARTBEAT_INTERVAL_MS;

        // Check existing sessions
        for (const s of user.sessions) {
          // If lastSeen is within 1 day → still active
          const lastSeen = s.lastSeen ?? s.createdAt;
          const expiresAt = new Date(lastSeen.getTime() + MAX_SESSION_AGE_MS);

          if (expiresAt > now) {
            // Still active session → block new login
            throw new Error("Already logged in from another device");
          }
        }

        // ✅ Create new session for this login
        await prisma.userSession.create({
          data: {
            userId: user.id,
            device: req.headers?.["user-agent"] ?? "Unknown Device",
            createdAt: now,
            lastSeen: now,
            expiresAt: new Date(now.getTime() + MAX_SESSION_AGE_MS),
          },
        });


        await prisma.userActivity.deleteMany({
          where: {
            userId: user.id,
            action: "LOGIN", // only remove previous login activities
          },
        });

        // login handler
        await prisma.userActivity.create({
          data: {
            userId: user.id,
            action: "LOGIN",

          }
        });

        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.profileUrl || null;
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
      }else {
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


//   callbacks: {
//   async jwt({ token, user, trigger }) {
//     // On sign in → populate the token
//     if (user) {
//       token.id = user.id;
//       token.role = user.role;
//       token.picture = user.profileUrl || null;
//       token.name = user.name || null;
//       token.email = user.email || null;
//     }

//     // 🔥 added → On sign out → clear the token
//    if (trigger === "signOut") {
//   return {
//     id: undefined,
//     role: undefined,
//     picture: null,
//     name: null,
//     email: null,
//   } ; // 👈 cast to JWT to satisfy TS
// }



//     return token;
//   },

//   async session({ session, token }) {
//     if (token?.id) {
//       session.user.id = token.id as string;
//       session.user.role = token.role as string;
//       session.user.picture = token.picture as string | null;
//       session.user.name = token.name as string | null;
//       session.user.email = token.email as string | null;
//     } else {
//       // 🔥 added → If no token (after signOut), clear session
//       session.user = null as any;
//     }
//     return session;
//   },
// },


  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };

// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;                // required to identify user
      name: string | null;
      email: string | null;
      image?: string | null;     // NextAuth default avatar field
      role: string;
      picture?: string | null;   // optional, custom profile URL
    };
  }

  interface User {
    id: string;
    name: string | null;
    email: string | null;
    password?: string;          // optional, only for credentials login
    role: string;
    profileUrl?: string | null; // optional, your stored avatar
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    picture?: string | null;   // optional, carry profile URL through JWT
  }
}

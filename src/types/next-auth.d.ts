import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; 
      name: string;
      email: string;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    id: string;           // Also needed in User type, used by JWT and session
    name: string;
    email: string;
    password?: string;    // Optional if present on your User model
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;           // Carry it through JWT
    name: string;
    email: string;
    role: string;
  }
}

// components/Providers.tsx
"use client";
import { Session } from "next-auth";

import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";

export default function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return <SessionProvider session={session}>
    <ToastContainer />
    {children}</SessionProvider>;
}
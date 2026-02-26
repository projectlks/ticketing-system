// components/Providers.tsx
"use client";
import { Session } from "next-auth";
import { useState } from "react";

import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";
import { QueryClientProvider } from "@tanstack/react-query";

import { createQueryClient } from "@/libs/tanstack-query/query-client";

export default function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  // Browser tab တစ်ခုအတွက် QueryClient တစ်ခုတည်းပဲထားမှ cache reuse ကောင်းပြီး
  // route ပြောင်းသွားချိန်တိုင်း query state အသစ်မဖန်တီးတော့ပါ။
  const [queryClient] = useState(() => createQueryClient());

  return <SessionProvider session={session}>
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      {children}
    </QueryClientProvider>
  </SessionProvider>;
}

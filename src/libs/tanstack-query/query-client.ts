import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Data အများစုက real-time hard requirement မဟုတ်လို့ short stale window ထားပြီး
        // navigation/perceived speed ကိုမြှင့်ထားပါတယ်။
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

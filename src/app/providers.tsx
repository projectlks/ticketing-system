// app/providers.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

// Web ပေါ်ရောက်မှသာ PostHog ကို စတင်အလုပ်လုပ်စေမည်
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // Anonymous တွေကို အကုန်မမှတ်ဘဲ User တွေကိုပဲ မှတ်ရန်
    capture_pageview: false // Next.js မှာ router event နဲ့ ဖမ်းမှာမို့ အလိုအလျောက်ဖမ်းတာကို ယာယီပိတ်ထားမည်
  })
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
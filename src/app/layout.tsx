import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PortalRoot from "@/components/PortalRoot";

import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import Providers from "@/components/Provider";
import { TicketCountProvider } from "@/context/TicketCountContext";
import { UserDataProvider } from "@/context/UserProfileContext";



import "@/libs/cron"; // <- starts cron job when server boots
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


// Update title and description here:
export const metadata: Metadata = {
  description: "A modern and efficient ticketing system for managing customer support and service requests."
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add favicon link here */}
        <link rel="icon" href="/logo.png" />
        <title>
          {session?.user?.name
            ? `${session.user.name} - Ticketing System`
            : "Ticketing System"}
        </title>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <UserDataProvider>
              <TicketCountProvider>
                {children}
                <PortalRoot />
              </TicketCountProvider>
            </UserDataProvider>
          </ThemeProvider>
        <div id="portal-root"></div>
        </Providers>
      </body>
    </html>
  );
}

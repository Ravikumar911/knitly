import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { Providers } from "./providers";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slash - Your Personal Finance Assistant",
  description: "AI-powered personal finance focused on DoorDash and Uber Eats analytics for users in the USA and Canada, powered by automatic email analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon links */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={geistMono.className}>
        <TRPCReactProvider>
          <Providers>{children}</Providers>
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}

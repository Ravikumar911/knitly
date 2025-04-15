import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { Providers } from "./providers";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinAI - AI Financial Advisor",
  description: "FinAI is a platform for financial advisors to manage their clients and their finances.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TRPCReactProvider>
          <Providers>{children}</Providers>
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Knitly",
    template: "%s | Knitly"
  },
  description: "Connect with like-minded locals and make real-world friendships — powered by AI",
  keywords: [
    "Knitly",
    "community",
    "local events",
    "AI",
    "social platform"
  ],
  authors: [
    {
      name: "Knitly",
      url: "https://knitly.com",
    },
  ],
  creator: "Knitly",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

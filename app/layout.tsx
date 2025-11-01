import "./globals.css";
import "katex/dist/katex.min.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ClientAnalytics } from "@/components/client-analytics";
import { Toaster } from "@/components/ui/sonner";
// import { Databuddy } from '@databuddy/sdk';

import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://draftpen.com"),
  title: {
    default: "Draftpen - AI-first content writing software",
    template: "%s | Draftpen",
  },
  description:
    "Draftpen is an AI-first content writing software that helps you write better content faster.",
  openGraph: {
    title: "Draftpen - AI-first content writing software",
    url: "https://draftpen.com",
    siteName: "Draftpen",
  },
  keywords: [
    "draftpen",
    "perplexity alternative",
    "ai content writing",
    "ai content production",
    "Draftpen",
    "DRAFTPEN",
    "open source ai writing software",
    "AI",
  ],
  // Explicit icon links for wide browser support
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
    other: [{ rel: "mask-icon", url: "/favicon.svg", color: "#111111" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F9F9" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

const inter = localFont({
  src: "../node_modules/inter-ui/variable/InterVariable.woff2",
  variable: "--font-sans",
  preload: true,
  display: "swap",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" />
            {children}
          </Providers>
        </NuqsAdapter>
        {/* <Databuddy clientId={process.env.DATABUDDY_CLIENT_ID!} enableBatching={true} trackSessions={true} /> */}
        <ClientAnalytics />
      </body>
    </html>
  );
}

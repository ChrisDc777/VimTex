import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { STRIP_EXTENSION_HYDRATION_ATTRS_SCRIPT } from "@/lib/strip-extension-hydration-attrs";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Local files avoid Turbopack's flaky Google Fonts resolver for JetBrains Mono. */
const jetbrainsMono = localFont({
  src: [
    {
      path: "./fonts/jetbrains-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/jetbrains-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-brand-mono",
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3001");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "VimTex",
  description: "Keyboard-first Vim + LaTeX scratchpad with inline math",
  applicationName: "VimTex",
  openGraph: {
    title: "VimTex",
    description: "Keyboard-first Vim + LaTeX scratchpad with inline math",
    siteName: "VimTex",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VimTex",
    description: "Keyboard-first Vim + LaTeX scratchpad with inline math",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111214",
};

const fontVars = `${geist.variable} ${geistMono.variable} ${jetbrainsMono.variable}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${fontVars} min-h-full bg-canvas text-ink antialiased`}
      >
        <Script id="strip-extension-hydration-attrs" strategy="beforeInteractive">
          {STRIP_EXTENSION_HYDRATION_ATTRS_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}

import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/layout/providers";
import { LayoutCentered } from "@/components/layout/layout-centered";
import { ThirdPartyScripts } from "@/components/cookies/third-party-scripts";
import { DynamicScripts } from "@/components/cookies/dynamic-scripts";
import { CookieConsentBanner } from "@/components/cookies/cookie-consent-banner";
import { CookieSettingsDialog } from "@/components/cookies/cookie-settings-dialog";
import { CookieErrorBoundary } from "@/components/cookies/cookie-error-boundary";

import { site } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: site.defaultTitle,
    template: `%s | ${site.name}`,
  },
  description: site.defaultDescription,
  metadataBase: new URL(site.url),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.defaultTitle,
    description: site.defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: site.defaultTitle,
    description: site.defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  authors: [{ name: "gtdn.online", url: "https://www.gtdn.online" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={site.locale}
      suppressHydrationWarning
      className={`scroll-pt-16 scroll-smooth ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>
          <div className="relative isolate">
            <LayoutCentered>{children}</LayoutCentered>
          </div>
          <CookieErrorBoundary>
            <CookieConsentBanner />
            <CookieSettingsDialog />
            <DynamicScripts />
          </CookieErrorBoundary>
          <TailwindScreen />
          <Toaster />
        </Providers>

        {/* Load scripts that are controlled by our cookie consent settings. */}
        <Suspense fallback={null}>
          <ThirdPartyScripts />
        </Suspense>
      </body>
    </html>
  );
}

function TailwindScreen() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-16 left-5 z-99999 flex size-9 items-center justify-center rounded-full bg-[#282828] text-xs font-bold text-white uppercase inset-ring-1 inset-ring-current/15 dark:bg-black">
      <div className="sm:hidden">-</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
}

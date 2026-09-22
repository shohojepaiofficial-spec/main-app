import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import { WhatsAppButton } from "@/views/WhatsAppButton";
import { ConfirmDialog } from "@/views/ConfirmDialog";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";
import { GTM_ID, isGtmConfigured } from "@/lib/gtm";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Italic-only, weight 500 — used for the hero banner's small eyebrow accent
// line (HeroSlider.tsx), nowhere else, so no need for other weights/styles.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Shop Quality Products Online`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Shop Quality Products Online`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    // Resolved against `metadataBase` above. Falls back to this on any page
    // that doesn't set its own (e.g. via generateMetadata) — see the shop
    // product page for the one page that overrides it with a real photo.
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Shop Quality Products Online`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#15914f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {isGtmConfigured() && (
        // Google's own container snippet, loaded via next/script's
        // recommended `afterInteractive` strategy — see lib/gtm.ts.
        <Script id="gtm-base" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable} antialiased`}
      >
        {isGtmConfigured() && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Providers>
          {children}
          <WhatsAppButton />
          <ConfirmDialog />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}

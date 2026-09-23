import type { Metadata } from "next";
import { PlaceholderPage } from "@/views/PlaceholderPage";

const title = "About Us";
const description = "Learn more about who we are and what we do.";

export const metadata: Metadata = {
  title,
  description,
  // Falls back to the site's default OG image (not inherited automatically
  // from layout.tsx — see the shop/[id] product page for why).
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { title, description, images: ["/og-image.png"] },
};

export default function AboutPage() {
  return <PlaceholderPage title="About" />;
}

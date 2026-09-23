import type { Metadata } from "next";
import { ContactView } from "@/views/ContactView";

const title = "Contact Us";
const description = "Get in touch with our team.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { title, description, images: ["/og-image.png"] },
};

export default function ContactPage() {
  return <ContactView />;
}

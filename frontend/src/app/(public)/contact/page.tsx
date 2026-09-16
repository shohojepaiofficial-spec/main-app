import type { Metadata } from "next";
import { ContactView } from "@/views/ContactView";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with our team.",
};

export default function ContactPage() {
  return <ContactView />;
}

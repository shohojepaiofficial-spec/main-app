import type { Metadata } from "next";
import { PlaceholderPage } from "@/views/PlaceholderPage";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about who we are and what we do.",
};

export default function AboutPage() {
  return <PlaceholderPage title="About" />;
}

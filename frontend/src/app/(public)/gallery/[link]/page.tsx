import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGalleryShare } from "@/services/galleryShareService";
import { GalleryShareView } from "@/views/GalleryShareView";

export const metadata: Metadata = {
  title: "Shared photos",
  robots: { index: false, follow: false },
};

export default async function GallerySharePage({ params }: { params: Promise<{ link: string }> }) {
  const { link } = await params;
  const share = await getGalleryShare(link);
  if (!share) notFound();

  return <GalleryShareView share={share} />;
}

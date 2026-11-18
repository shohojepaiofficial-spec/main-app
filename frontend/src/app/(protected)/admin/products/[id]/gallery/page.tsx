"use client";

import { useParams } from "next/navigation";
import { ProductGalleryView } from "@/views/ProductGalleryView";

export default function ProductGalleryPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductGalleryView productId={id} />;
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { toUploadUrl } from "@/lib/api";
import { useTranslations } from "@/controllers/useTranslations";
import { useProductPreviewStore } from "@/controllers/useProductPreviewStore";

export function ProductGallery({
  images,
  name,
  productId,
  initialImage,
}: {
  images: string[];
  name: string;
  productId: string;
  // The image of the variant in the page's ?variant= link, if it has one —
  // so a shared link to the black hoodie opens on the black photo.
  initialImage?: string;
}) {
  const { t } = useTranslations();
  // The option picker (ProductBuyBox) publishes the picked variant's image
  // here; see useProductPreviewStore. Ignored if it's for another product.
  const preview = useProductPreviewStore((s) => (s.productId === productId ? s : null));
  // A thumbnail click, remembered only until the next variant pick —
  // `version` is the store's at the time of the click.
  const [clicked, setClicked] = useState<{ image: string; version: number } | null>(null);

  const previewVersion = preview?.version ?? 0;
  const active =
    clicked && clicked.version === previewVersion
      ? clicked.image
      : (preview?.image ?? initialImage ?? images[0]);

  return (
    <div>
      <div className="relative aspect-square rounded-md border border-border bg-background overflow-hidden">
        {active ? (
          <Image
            src={toUploadUrl(active)}
            alt={name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            {t("product.noImage", "No image")}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              onClick={() => setClicked({ image, version: previewVersion })}
              aria-label={t("product.showImageN", "Show image {n}", { n: index + 1 })}
              aria-current={image === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border ${
                image === active ? "border-primary" : "border-border"
              }`}
            >
              <Image src={toUploadUrl(image)} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

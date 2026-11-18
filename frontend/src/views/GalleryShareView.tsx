"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X, ZoomIn } from "lucide-react";
import { toUploadUrl } from "@/lib/api";
import { GalleryShareView as GalleryShareData } from "@/models";

interface GalleryShareViewProps {
  share: GalleryShareData;
}

// One <a download> per image, sequentially — the images are already public
// GETs (Cloudinary or /uploads), so no zip/server work is needed for a
// first cut. Sequential, not Promise.all, so the browser doesn't choke on
// a burst of simultaneous downloads.
async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function GalleryShareView({ share }: GalleryShareViewProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (zoomedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedIndex(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [zoomedIndex]);

  const downloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      for (let i = 0; i < share.images.length; i++) {
        const image = share.images[i];
        await downloadImage(toUploadUrl(image.url), `${share.productName.replace(/\W+/g, "-")}-${i + 1}.webp`);
      }
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-xl font-semibold">{share.productName}</h1>
      <p className="mt-1 text-sm text-muted">{share.images.length} photo{share.images.length === 1 ? "" : "s"} shared with you</p>

      {share.images.length > 1 && (
        <button
          type="button"
          onClick={downloadAll}
          disabled={isDownloadingAll}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isDownloadingAll ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download all
        </button>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {share.images.map((image, i) => (
          <div key={image.id} className="overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setZoomedIndex(i)}
              className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden"
              aria-label="Zoom in on image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- public share page, arbitrary Cloudinary/local URLs */}
              <img src={toUploadUrl(image.url)} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-150 group-hover:bg-black/20 group-hover:opacity-100">
                <ZoomIn size={28} className="text-white drop-shadow" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => downloadImage(toUploadUrl(image.url), `${share.productName.replace(/\W+/g, "-")}-${i + 1}.webp`)}
              className="flex w-full items-center justify-center gap-2 border-t border-border py-2 text-sm text-muted hover:text-foreground"
            >
              <Download size={14} /> Download
            </button>
          </div>
        ))}
      </div>

      {zoomedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedIndex(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedIndex(null)}
            aria-label="Close zoomed image"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- public share page, arbitrary Cloudinary/local URLs */}
          <img
            src={toUploadUrl(share.images[zoomedIndex].url)}
            alt=""
            className="max-h-full max-w-full cursor-zoom-out rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

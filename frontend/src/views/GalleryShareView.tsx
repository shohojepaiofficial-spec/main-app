"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
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
            {/* eslint-disable-next-line @next/next/no-img-element -- public share page, arbitrary Cloudinary/local URLs */}
            <img src={toUploadUrl(image.url)} alt="" className="aspect-square w-full object-cover" />
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
    </div>
  );
}

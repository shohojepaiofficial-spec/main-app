"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, Tag, Trash2, Upload, X } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useProductGallery } from "@/controllers/useProductGallery";
import { IMAGE_ACCEPT } from "@/lib/imageUpload";
import { toUploadUrl } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { ProductGalleryImage } from "@/models";

interface ProductGalleryViewProps {
  productId: string;
}

function TagEditor({ image, onUpdate }: { image: ProductGalleryImage; onUpdate: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const addTag = () => {
    const tag = draft.trim().toLowerCase();
    if (!tag || image.tags.includes(tag)) return;
    onUpdate([...image.tags, tag]);
    setDraft("");
  };
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {image.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {tag}
            <button type="button" onClick={() => onUpdate(image.tags.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Tag size={12} className="text-muted" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add tag"
          className="w-full rounded border border-border bg-transparent px-1.5 py-0.5 text-xs outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

export function ProductGalleryView({ productId }: ProductGalleryViewProps) {
  const { isChecking, isAllowed } = useRequirePermission("products:manage");
  const {
    images, isLoading, tagFilter, selectedIds, isUploading, deletingIds, isCreatingLink, shareLink,
    setTagFilter, toggleSelect, clearSelection, upload, updateTags, remove, createShareLink, closeShareLink,
  } = useProductGallery(productId);
  const [uploadTags, setUploadTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    upload(Array.from(files), uploadTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> Back to products
      </Link>
      <h1 className="text-xl font-semibold">Photo gallery</h1>
      <p className="mt-1 text-sm text-muted">
        Upload every photo you have for this product, tag them, then select a few to share one link with a teammate or customer.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted">Tags for new uploads (comma separated)</label>
          <input
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder="angle-2, packaging"
            className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Upload images
        </button>
        <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => onFilesPicked(e.target.files)} />

        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-muted">Filter by tag</label>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="packaging"
            className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-10 mt-4 flex items-center justify-between rounded-md border border-primary/40 bg-surface px-4 py-2 shadow-md">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={clearSelection} className="text-sm text-muted hover:text-foreground">
              Clear
            </button>
            <button
              type="button"
              onClick={createShareLink}
              disabled={isCreatingLink}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {isCreatingLink ? <Loader2 size={14} className="animate-spin" /> : null}
              Create share link
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 text-sm text-muted">Loading gallery...</div>
      ) : images.length === 0 ? (
        <div className="mt-8 text-sm text-muted">No extra photos yet — upload some above.</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => {
            const selected = selectedIds.has(image._id);
            const isDeleting = deletingIds.has(image._id);
            return (
              <div key={image._id} className={`rounded-lg border p-2 ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${isDeleting ? "opacity-50" : ""}`}>
                <button
                  type="button"
                  onClick={() => toggleSelect(image._id)}
                  disabled={isDeleting}
                  className="relative block aspect-square w-full overflow-hidden rounded-md bg-primary/5"
                  aria-pressed={selected}
                  aria-label={selected ? "Deselect image" : "Select image"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- staff-only gallery, arbitrary external/Cloudinary URLs */}
                  <img src={toUploadUrl(image.url)} alt="" className="h-full w-full object-cover" />
                  <span className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface/80"}`}>
                    {selected && <Check size={12} />}
                  </span>
                </button>
                <TagEditor image={image} onUpdate={(tags) => updateTags(image._id, tags)} />
                <button
                  type="button"
                  onClick={() => remove(image._id)}
                  disabled={isDeleting}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!shareLink} onClose={closeShareLink} title="Share link ready" widthClassName="max-w-md" guardUnsavedChanges={false}>
        <p className="text-sm text-muted">Anyone with this link can view and download the selected photos, no account needed.</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border p-2">
          <span className="flex-1 truncate text-sm">{shareLink}</span>
          <button
            type="button"
            onClick={() => shareLink && navigator.clipboard.writeText(shareLink)}
            aria-label="Copy link"
            className="text-muted hover:text-foreground"
          >
            <Copy size={16} />
          </button>
        </div>
      </Modal>
    </div>
  );
}

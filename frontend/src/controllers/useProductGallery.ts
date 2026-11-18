"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as productGalleryService from "@/services/productGalleryService";
import { splitValidImages } from "@/lib/imageUpload";
import { ProductGalleryImage } from "@/models";

export function useProductGallery(productId: string) {
  const [images, setImages] = useState<ProductGalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const load = useCallback((tag: string) => {
    setIsLoading(true);
    return productGalleryService
      .getGalleryImages(productId, tag || undefined)
      .then(setImages)
      .catch(() => toast.error("Failed to load the gallery"))
      .finally(() => setIsLoading(false));
  }, [productId]);

  // Mount-only fetch — see useAdminProducts.ts for why this isn't routed
  // through `load` (react-hooks/set-state-in-effect).
  useEffect(() => {
    let ignore = false;
    productGalleryService
      .getGalleryImages(productId)
      .then((data) => { if (!ignore) setImages(data); })
      .catch(() => { if (!ignore) toast.error("Failed to load the gallery"); })
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, [productId]);

  const applyTagFilter = useCallback((tag: string) => {
    setTagFilter(tag);
    setSelectedIds(new Set());
    load(tag);
  }, [load]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const upload = useCallback(async (files: File[], tags: string[]) => {
    const { valid, errors } = splitValidImages(files);
    errors.forEach((e) => toast.error(e));
    if (valid.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await productGalleryService.uploadGalleryImages(productId, valid, tags);
      setImages((prev) => [...uploaded, ...prev]);
      toast.success(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  }, [productId]);

  const updateTags = useCallback(async (imageId: string, tags: string[]) => {
    try {
      const updated = await productGalleryService.updateGalleryImageTags(productId, imageId, tags);
      setImages((prev) => prev.map((img) => (img._id === imageId ? updated : img)));
    } catch {
      toast.error("Failed to update tags");
    }
  }, [productId]);

  const remove = useCallback(async (imageId: string) => {
    setDeletingIds((prev) => new Set(prev).add(imageId));
    try {
      await productGalleryService.deleteGalleryImage(productId, imageId);
      setImages((prev) => prev.filter((img) => img._id !== imageId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  }, [productId]);

  const createShareLink = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsCreatingLink(true);
    try {
      const { link } = await productGalleryService.createGalleryShare(productId, [...selectedIds]);
      const url = `${window.location.origin}/gallery/${link}`;
      setShareLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied");
    } catch {
      toast.error("Failed to create a share link");
    } finally {
      setIsCreatingLink(false);
    }
  }, [productId, selectedIds]);

  return {
    images, isLoading, tagFilter, selectedIds, isUploading, deletingIds, isCreatingLink, shareLink,
    setTagFilter: applyTagFilter, toggleSelect, clearSelection, upload, updateTags, remove, createShareLink,
    closeShareLink: () => setShareLink(null),
  };
}

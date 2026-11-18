import { api } from "@/lib/api";
import { GalleryShareResult, ProductGalleryImage } from "@/models";

export const getGalleryImages = async (productId: string, tag?: string): Promise<ProductGalleryImage[]> => {
  const { data } = await api.get<ProductGalleryImage[]>(`/products/${productId}/gallery`, { params: tag ? { tag } : undefined });
  return data;
};

export const uploadGalleryImages = async (productId: string, files: File[], tags: string[]): Promise<ProductGalleryImage[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (tags.length > 0) formData.append("tags", tags.join(","));
  const { data } = await api.post<ProductGalleryImage[]>(`/products/${productId}/gallery`, formData);
  return data;
};

export const updateGalleryImageTags = async (productId: string, imageId: string, tags: string[]): Promise<ProductGalleryImage> => {
  const { data } = await api.patch<ProductGalleryImage>(`/products/${productId}/gallery/${imageId}`, { tags });
  return data;
};

export const deleteGalleryImage = async (productId: string, imageId: string): Promise<void> => {
  await api.delete(`/products/${productId}/gallery/${imageId}`);
};

export const createGalleryShare = async (productId: string, imageIds: string[]): Promise<GalleryShareResult> => {
  const { data } = await api.post<GalleryShareResult>(`/products/${productId}/gallery/share`, { imageIds });
  return data;
};

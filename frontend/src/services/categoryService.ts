import { api } from "@/lib/api";
import { ManagedCategory } from "@/models";

// Staff-side category list. The storefront's own list (only categories that
// have a product) is productService.getProductCategories.
export const getAllCategories = async (): Promise<ManagedCategory[]> => {
  const { data } = await api.get<ManagedCategory[]>("/categories");
  return data;
};

export interface CategoryInput {
  name: string;
  nameBn: string;
  // Only read on update: drops the current photo when no new one is sent.
  removeImage?: boolean;
}

function buildFormData(input: CategoryInput, image?: File) {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("nameBn", input.nameBn);
  if (input.removeImage) formData.append("removeImage", "true");
  if (image) formData.append("image", image);
  return formData;
}

export const createCategory = async (input: CategoryInput, image?: File): Promise<ManagedCategory> => {
  const { data } = await api.post<ManagedCategory>("/categories", buildFormData({ ...input, removeImage: false }, image));
  return data;
};

export const updateCategory = async (id: string, input: CategoryInput, image?: File): Promise<ManagedCategory> => {
  const { data } = await api.put<ManagedCategory>(`/categories/${id}`, buildFormData(input, image));
  return data;
};

export const moveCategory = async (id: string, direction: "up" | "down"): Promise<ManagedCategory[]> => {
  const { data } = await api.patch<ManagedCategory[]>(`/categories/${id}/move`, { direction });
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};

import { api } from "@/lib/api";
import { StoreLocation } from "@/models";

// Public storefront list — active locations only.
export const getStoreLocations = async (): Promise<StoreLocation[]> => {
  const { data } = await api.get<StoreLocation[]>("/store-locations");
  return data;
};

// Staff-side list — every location, including inactive ones.
export const getAllStoreLocations = async (): Promise<StoreLocation[]> => {
  const { data } = await api.get<StoreLocation[]>("/store-locations/all");
  return data;
};

export interface StoreLocationInput {
  name: string;
  address: string;
  phone: string;
  mapUrl: string;
  isActive?: boolean;
  removeImages?: string[];
}

function buildFormData(input: StoreLocationInput, images: File[]) {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("address", input.address);
  formData.append("phone", input.phone);
  formData.append("mapUrl", input.mapUrl);
  if (input.isActive !== undefined) formData.append("isActive", String(input.isActive));
  (input.removeImages ?? []).forEach((url) => formData.append("removeImages", url));
  images.forEach((image) => formData.append("images", image));
  return formData;
}

export const createStoreLocation = async (input: StoreLocationInput, images: File[]): Promise<StoreLocation> => {
  const { data } = await api.post<StoreLocation>("/store-locations", buildFormData(input, images));
  return data;
};

export const updateStoreLocation = async (id: string, input: StoreLocationInput, images: File[]): Promise<StoreLocation> => {
  const { data } = await api.put<StoreLocation>(`/store-locations/${id}`, buildFormData(input, images));
  return data;
};

export const moveStoreLocation = async (id: string, direction: "up" | "down"): Promise<StoreLocation[]> => {
  const { data } = await api.patch<StoreLocation[]>(`/store-locations/${id}/move`, { direction });
  return data;
};

export const deleteStoreLocation = async (id: string): Promise<void> => {
  await api.delete(`/store-locations/${id}`);
};

import { api } from "@/lib/api";
import { Paginated, Product, ProductCategory, ProductStats } from "@/models";

export interface GetProductsParams {
  category?: string;
  search?: string;
  excludeId?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export const getProducts = async (params?: GetProductsParams): Promise<Paginated<Product>> => {
  const { data } = await api.get<Paginated<Product>>("/products", { params });
  return data;
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const { data } = await api.get<ProductCategory[]>("/products/categories");
  return data;
};

// Admin ("products:manage") only — quick-glance dashboard numbers.
export const getProductStats = async (): Promise<ProductStats> => {
  const { data } = await api.get<ProductStats>("/products/stats");
  return data;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
  isFeatured: boolean;
  weightKg: number;
  newImages: File[];
}

export const createProduct = async (input: ProductInput): Promise<Product> => {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("description", input.description);
  formData.append("price", String(input.price));
  formData.append("stock", String(input.stock));
  formData.append("category", input.category);
  formData.append("deliveryFeeInsideCity", String(input.deliveryFeeInsideCity));
  formData.append("deliveryFeeOutsideCity", String(input.deliveryFeeOutsideCity));
  formData.append("isFeatured", String(input.isFeatured));
  formData.append("weightKg", String(input.weightKg));
  input.newImages.forEach((file) => formData.append("images", file));

  const { data } = await api.post<Product>("/products", formData);
  return data;
};

export const updateProduct = async (
  id: string,
  input: ProductInput & { existingImages: string[] }
): Promise<Product> => {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("description", input.description);
  formData.append("price", String(input.price));
  formData.append("stock", String(input.stock));
  formData.append("category", input.category);
  formData.append("deliveryFeeInsideCity", String(input.deliveryFeeInsideCity));
  formData.append("deliveryFeeOutsideCity", String(input.deliveryFeeOutsideCity));
  formData.append("isFeatured", String(input.isFeatured));
  formData.append("weightKg", String(input.weightKg));
  formData.append("existingImages", JSON.stringify(input.existingImages));
  input.newImages.forEach((file) => formData.append("images", file));

  const { data } = await api.put<Product>(`/products/${id}`, formData);
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

import { api } from "@/lib/api";
import { Paginated, Product, ProductCategory, ProductOption, ProductStats } from "@/models";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type DeliveryType = "free" | "paid";

export interface GetProductsParams {
  category?: string;
  search?: string;
  excludeId?: string;
  featured?: boolean;
  stockStatus?: StockStatus;
  deliveryType?: DeliveryType;
  dateFrom?: string;
  dateTo?: string;
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

// Admin ("products:manage") only — options to pre-fill the product form
// with once a category is picked: whatever that category's existing
// products use, or a keyword preset for a brand-new category.
export const getOptionSuggestions = async (category: string): Promise<ProductOption[]> => {
  const { data } = await api.get<ProductOption[]>("/products/option-suggestions", { params: { category } });
  return data;
};

// A variant as the admin form submits it. `image` is either one of the
// product's existing image URLs or "new:N" for the Nth file in `newImages`
// (it has no URL until the server stores it). `_id` is present for a
// variant that already exists, so carts/orders pointing at it stay valid.
export interface VariantInput {
  _id?: string;
  selections: { name: string; value: string }[];
  price: number;
  stock: number;
  sku?: string;
  image?: string;
  weightKg?: number;
}

// Pre-order settings as the admin form submits them — see
// models' ProductPreorder. `reserved` is never sent; only orders move it.
export interface PreorderInput {
  enabled: boolean;
  // yyyy-mm-dd, or absent for "no date yet".
  shipDate?: string;
  // Absent = no limit.
  limit?: number;
  codDiscountPercent: number;
  onlineDiscountPercent: number;
}

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
  // Both empty for a simple product (price/stock above are then the real
  // ones); otherwise the server derives price/stock from the variants.
  options: ProductOption[];
  variants: VariantInput[];
  preorder: PreorderInput;
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
  formData.append("options", JSON.stringify(input.options));
  formData.append("variants", JSON.stringify(input.variants));
  formData.append("preorder", JSON.stringify(input.preorder));
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
  formData.append("options", JSON.stringify(input.options));
  formData.append("variants", JSON.stringify(input.variants));
  formData.append("preorder", JSON.stringify(input.preorder));
  formData.append("existingImages", JSON.stringify(input.existingImages));
  input.newImages.forEach((file) => formData.append("images", file));

  const { data } = await api.put<Product>(`/products/${id}`, formData);
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

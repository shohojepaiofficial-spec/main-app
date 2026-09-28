import { api } from "@/lib/api";
import { StoreStats } from "@/models";

// Soft-fails to null: the stats section is decoration, and the homepage must
// never fail to render because of it (unlike getStoreCity, which it can't
// work without).
export const getStoreStats = async (): Promise<StoreStats | null> => {
  try {
    const { data } = await api.get<StoreStats>("/stats");
    return data;
  } catch {
    return null;
  }
};

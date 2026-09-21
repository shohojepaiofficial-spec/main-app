import { api } from "@/lib/api";
import { Translation } from "@/models";

// Only ever called when the visitor is on Bangla — English never fetches
// this at all, since the hardcoded fallback text at each <T>/t() call site
// already *is* the English copy. See controllers/useTranslationStore.ts.
export const getTranslations = async (): Promise<Record<string, string>> => {
  const { data } = await api.get<Record<string, string>>("/translations");
  return data;
};

// Admin (translations:manage) only, from here down.

export const getAllTranslations = async (): Promise<Translation[]> => {
  const { data } = await api.get<Translation[]>("/translations/all");
  return data;
};

export const updateTranslationBn = async (key: string, bn: string): Promise<Translation> => {
  const { data } = await api.put<Translation>(`/translations/${encodeURIComponent(key)}`, { bn });
  return data;
};

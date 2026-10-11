import { api } from "@/lib/api";
import { ActiveSession } from "@/models";

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
  const { data } = await api.get<ActiveSession[]>("/auth/sessions");
  return data;
};

export const revokeSession = async (id: string): Promise<void> => {
  await api.delete(`/auth/sessions/${encodeURIComponent(id)}`);
};

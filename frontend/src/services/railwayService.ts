import { api } from "@/lib/api";
import { RailwayUsageResponse } from "@/models";

export const getRailwayUsage = async (): Promise<RailwayUsageResponse> => {
  const { data } = await api.get<RailwayUsageResponse>("/stats/railway-usage");
  return data;
};

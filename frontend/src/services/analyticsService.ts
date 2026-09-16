import { api } from "@/lib/api";
import { AnalyticsEventType, AnalyticsOverview, AnalyticsRangePreset } from "@/models";

export const getAnalyticsOverview = async (
  range: AnalyticsRangePreset = "30d"
): Promise<AnalyticsOverview> => {
  const { data } = await api.get<AnalyticsOverview>("/analytics/overview", { params: { range } });
  return data;
};

// Admin only (not delegable — see server's analyticsRoutes.ts), from here
// down. `type` narrows to one event type or is omitted for both; `before`
// (an ISO date string) narrows to events older than that cutoff, or is
// omitted to match everything regardless of age.
export interface AnalyticsEventFilter {
  type?: AnalyticsEventType;
  before?: string;
}

export const getAnalyticsEventCount = async (filter: AnalyticsEventFilter): Promise<number> => {
  const { data } = await api.get<{ count: number }>("/analytics/events/count", { params: filter });
  return data.count;
};

export const resetAnalyticsEvents = async (filter: AnalyticsEventFilter): Promise<number> => {
  const { data } = await api.delete<{ deletedCount: number }>("/analytics/events", { params: filter });
  return data.deletedCount;
};

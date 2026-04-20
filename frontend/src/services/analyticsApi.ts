import api from "./api";

export interface AnalyticsOverview {
  period_days: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
  ai_messages: number;
  human_messages: number;
  active_conversations: number;
  avg_response_seconds: number | null;
  messages_per_day: { date: string; total: number; inbound: number; outbound: number }[];
  messages_per_hour: { hour: number; count: number }[];
  top_conversations: { phone_number: string; customer_name: string; message_count: number }[];
}

export async function getAnalytics(period: "7d" | "30d" | "90d" = "7d"): Promise<AnalyticsOverview> {
  const { data } = await api.get("/analytics/overview", { params: { period } });
  return data;
}

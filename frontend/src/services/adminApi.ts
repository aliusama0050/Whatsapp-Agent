import api from "./api";

export interface AdminDashboard {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  active_windows: number;
  uptime_seconds: number;
  environment: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  username: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemHealth {
  database: string;
  whatsapp_api: string;
  environment: string;
  uptime_seconds: number;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get("/admin/dashboard");
  return data;
}

export async function getAuditLogs(
  page = 1,
  limit = 50,
  action?: string
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const params: Record<string, string | number> = { page, limit };
  if (action) params.action = action;
  const { data } = await api.get("/admin/audit-logs", { params });
  return { logs: Array.isArray(data.logs) ? data.logs : [], total: data.total ?? 0 };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const { data } = await api.get("/admin/health");
  return data;
}

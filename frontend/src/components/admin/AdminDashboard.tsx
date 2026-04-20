import { useEffect, useState } from "react";
import { getAdminDashboard, type AdminDashboard as DashboardData } from "../../services/adminApi";
import { Users, MessageSquare, MessagesSquare, Clock, Wifi, Server } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const stats = [
    { label: "Total Users", value: data.total_users, sub: `${data.active_users} active`, icon: Users, color: "text-blue-500" },
    { label: "Conversations", value: data.total_conversations, icon: MessagesSquare, color: "text-emerald-500" },
    { label: "Total Messages", value: data.total_messages, icon: MessageSquare, color: "text-purple-500" },
    { label: "Active Windows", value: data.active_windows, icon: Clock, color: "text-amber-500" },
    { label: "Uptime", value: formatUptime(data.uptime_seconds), icon: Server, color: "text-cyan-500" },
    { label: "Environment", value: data.environment, icon: Wifi, color: data.environment === "production" ? "text-emerald-500" : "text-amber-500" },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">System Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
            {s.sub && <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getSystemHealth, type SystemHealth } from "../../services/adminApi";
import { Database, Wifi, Server, RefreshCw } from "lucide-react";

export default function SystemSettings() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => {
    setLoading(true);
    getSystemHealth()
      .then(setHealth)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">System Health</h2>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {health && (
        <div className="space-y-4">
          <StatusRow
            icon={Database}
            label="Database (PostgreSQL)"
            status={health.database}
            ok={health.database === "connected"}
          />
          <StatusRow
            icon={Wifi}
            label="WhatsApp Cloud API"
            status={health.whatsapp_api}
            ok={health.whatsapp_api === "connected"}
          />
          <StatusRow
            icon={Server}
            label="Server Uptime"
            status={formatUptime(health.uptime_seconds)}
            ok={true}
          />
          <StatusRow
            icon={Server}
            label="Environment"
            status={health.environment}
            ok={health.environment === "production"}
          />
        </div>
      )}
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  status,
  ok,
}: {
  icon: typeof Database;
  label: string;
  status: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            ok ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <span className={`text-sm ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

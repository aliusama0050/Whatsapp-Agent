import { useEffect, useState } from "react";
import { getAuditLogs, type AuditLogEntry } from "../../services/adminApi";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  user_created: "User Created",
  user_updated: "User Updated",
  user_deleted: "User Deleted",
  password_reset: "Password Reset",
  ai_config_updated: "AI Config Updated",
  canned_response_created: "Quick Reply Created",
  canned_response_updated: "Quick Reply Updated",
  canned_response_deleted: "Quick Reply Deleted",
};

const ACTION_COLORS: Record<string, string> = {
  user_created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  user_deleted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  password_reset: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ai_config_updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    getAuditLogs(page, limit, actionFilter || undefined)
      .then(({ logs, total }) => {
        setLogs(logs);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Audit Log</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-10">No audit logs found.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_COLORS[log.action] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-zinc-400">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    by <span className="font-medium text-zinc-800 dark:text-zinc-200">{log.username}</span>
                    {log.target_type && (
                      <span>
                        {" "}
                        on {log.target_type}
                        {log.target_id && <span className="text-zinc-400"> ({log.target_id.slice(0, 8)}...)</span>}
                      </span>
                    )}
                  </p>
                  {log.details && (
                    <p className="text-xs text-zinc-400 mt-1 font-mono truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-zinc-500">
                {total} entries — page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

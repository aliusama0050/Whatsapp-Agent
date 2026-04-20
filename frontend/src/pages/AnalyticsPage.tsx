import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import { getAnalytics } from "../services/analyticsApi";
import type { AnalyticsOverview } from "../services/analyticsApi";
import { ArrowLeft, MessageSquare, Users, Bot, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type Period = "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getAnalytics(period)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const formatResponseTime = (seconds: number | null) => {
    if (seconds === null) return "N/A";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <Header />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h2>
          </div>

          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(["7d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="flex items-center justify-center p-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <SummaryCard icon={MessageSquare} label="Total Messages" value={data.total_messages} color="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30" />
              <SummaryCard icon={Users} label="Active Conversations" value={data.active_conversations} color="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30" />
              <SummaryCard icon={Bot} label="AI Messages" value={data.ai_messages} color="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30" />
              <SummaryCard icon={Clock} label="Avg Response Time" value={formatResponseTime(data.avg_response_seconds)} color="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30" />
            </div>

            {/* Messages per day chart */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Messages Per Day</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.messages_per_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-zinc-200, #e4e4e7)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="inbound" name="Inbound" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Messages per hour chart */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 mb-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Messages By Hour</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Array.from({ length: 24 }, (_, i) => ({
                  hour: `${i}:00`,
                  count: data.messages_per_hour.find((h) => h.hour === i)?.count ?? 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-zinc-200, #e4e4e7)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Messages" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top conversations */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Top Conversations</h3>
              <div className="space-y-1">
                {data.top_conversations.map((c, i) => (
                  <div key={c.phone_number} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <span className="text-xs font-medium text-zinc-400 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">{c.customer_name}</span>
                      <span className="text-xs text-zinc-400 ml-2">{c.phone_number}</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.message_count} msgs</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
      <div className={`inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

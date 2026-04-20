import { useEffect, useState } from "react";
import { getStats } from "../../services/conversationApi";
import { MessageSquare, Clock, UserCheck, BarChart3 } from "lucide-react";

export default function StatsBar() {
  const [stats, setStats] = useState({ total_conversations: 0, active_windows: 0, human_takeovers: 0, messages_today: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    const interval = setInterval(() => getStats().then(setStats).catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: "Conversations", value: stats.total_conversations, icon: MessageSquare, color: "text-blue-500" },
    { label: "Active Windows", value: stats.active_windows, icon: Clock, color: "text-emerald-500" },
    { label: "Human Takeover", value: stats.human_takeovers, icon: UserCheck, color: "text-amber-500" },
    { label: "Messages Today", value: stats.messages_today, icon: BarChart3, color: "text-violet-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
          <item.icon className={`h-5 w-5 ${item.color}`} />
          <div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{item.value}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

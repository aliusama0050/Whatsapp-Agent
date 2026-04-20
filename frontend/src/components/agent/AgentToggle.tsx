import { useState } from "react";
import { toggleAgent } from "../../services/conversationApi";
import { Bot, User } from "lucide-react";

interface Props {
  phoneNumber: string;
  status: "ai_active" | "human_takeover";
  onToggled: (newStatus: "ai_active" | "human_takeover") => void;
}

export default function AgentToggle({ phoneNumber, status, onToggled }: Props) {
  const [loading, setLoading] = useState(false);

  const isAI = status === "ai_active";

  const handleToggle = async () => {
    const newStatus = isAI ? "human_takeover" : "ai_active";
    const confirmMsg = isAI
      ? `Disable AI for ${phoneNumber}? You will need to respond manually.`
      : `Re-enable AI agent? It will resume auto-responding to new messages.`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await toggleAgent(phoneNumber, newStatus);
      onToggled(newStatus);
    } catch { /* handled by interceptor */ }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 group"
      title={isAI ? "Switch to human takeover" : "Re-enable AI agent"}
    >
      {/* Status badge */}
      <span className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${
        isAI
          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
      }`}>
        {isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
        <span className="hidden sm:inline">{isAI ? "AI Active" : "Human Takeover"}</span>
      </span>

      {/* Toggle switch */}
      <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
        loading ? "opacity-50 cursor-wait" : "cursor-pointer"
      } ${isAI ? "bg-emerald-500" : "bg-amber-500"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isAI ? "left-0.5" : "translate-x-5"
        }`}>
          <div className="flex h-full w-full items-center justify-center">
            {isAI ? (
              <Bot className="h-3 w-3 text-emerald-600" />
            ) : (
              <User className="h-3 w-3 text-amber-600" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

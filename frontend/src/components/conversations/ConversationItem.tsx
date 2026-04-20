import type { Conversation } from "../../types";
import { useWindowTimer } from "../../hooks/useWindowTimer";
import { TagDots } from "./TagManager";
import { Bot, User } from "lucide-react";

interface Props {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export default function ConversationItem({ conversation, isSelected, onClick }: Props) {
  const { remaining, urgency } = useWindowTimer(conversation.window_expires_at);

  const windowColors = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
    expired: "bg-zinc-400",
  };

  const timeAgo = conversation.last_message_at
    ? formatTimeAgo(new Date(conversation.last_message_at))
    : "";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-zinc-100 dark:border-zinc-800 p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        isSelected ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
      }`}
    >
      {/* Window status bar */}
      <div className={`mt-1 h-10 w-1 flex-shrink-0 rounded-full ${windowColors[urgency]}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-sm text-zinc-900 dark:text-zinc-100">
            {conversation.customer_name}
          </span>
          <span className="flex-shrink-0 text-xs text-zinc-400">{timeAgo}</span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {conversation.phone_number}
          <TagDots tags={conversation.tags ?? []} />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {conversation.last_message_preview || "No messages yet"}
          </span>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {/* Agent status */}
            {conversation.agent_status === "ai_active" ? (
              <Bot className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <User className="h-3.5 w-3.5 text-amber-500" />
            )}

            {/* Unread badge */}
            {conversation.unread_count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        {/* Window timer */}
        <div className="mt-1 text-[10px] text-zinc-400">{remaining}</div>
      </div>
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

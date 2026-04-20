import { useState } from "react";
import { useConversations } from "../../hooks/useConversations";
import ConversationItem from "./ConversationItem";
import { Search } from "lucide-react";

interface Props {
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
}

export default function ConversationList({ selectedPhone, onSelect }: Props) {
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState("");

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone_number.includes(search)
      )
    : conversations;

  return (
    <div className="flex h-full flex-col border-r border-zinc-200 dark:border-zinc-800">
      {/* Search */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            {search ? "No matching conversations" : "No conversations yet"}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.phone_number}
              conversation={conv}
              isSelected={conv.phone_number === selectedPhone}
              onClick={() => onSelect(conv.phone_number)}
            />
          ))
        )}
      </div>
    </div>
  );
}

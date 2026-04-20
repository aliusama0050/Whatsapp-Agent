import { useState, useEffect, useCallback } from "react";
import { getConversations } from "../services/conversationApi";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNotifications } from "./useNotifications";
import type { Conversation } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { lastEvent } = useWebSocket();
  const { notify } = useNotifications();

  const refresh = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations);
      setTotal(data.total);
    } catch { /* handled by interceptor */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // React to WebSocket events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "new_message") {
      // Browser notification for inbound messages
      if (lastEvent.message.direction === "inbound") {
        const name = lastEvent.customer_name || lastEvent.phone_number;
        notify(`New message from ${name}`, lastEvent.message.body?.slice(0, 100) || "Media message");
      }

      // Move conversation to top or add if new
      setConversations((prev) => {
        const phone = lastEvent.phone_number;
        const existing = prev.find((c) => c.phone_number === phone);
        if (existing) {
          const updated = {
            ...existing,
            last_message_at: lastEvent.message.timestamp,
            last_message_preview: lastEvent.message.body.slice(0, 80),
            unread_count: lastEvent.message.direction === "inbound"
              ? existing.unread_count + 1
              : existing.unread_count,
          };
          return [updated, ...prev.filter((c) => c.phone_number !== phone)];
        }
        // New conversation — refresh to get full data
        refresh();
        return prev;
      });
    }

    if (lastEvent.type === "agent_status_changed") {
      setConversations((prev) =>
        prev.map((c) =>
          c.phone_number === lastEvent.phone_number
            ? { ...c, agent_status: lastEvent.status as Conversation["agent_status"] }
            : c
        )
      );
    }
  }, [lastEvent, refresh]);

  return { conversations, total, loading, refresh };
}

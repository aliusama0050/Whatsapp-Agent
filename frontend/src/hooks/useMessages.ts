import { useState, useEffect, useCallback } from "react";
import { getMessages } from "../services/messageApi";
import { useWebSocket } from "../contexts/WebSocketContext";
import type { Message } from "../types";

export function useMessages(phoneNumber: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const { lastEvent } = useWebSocket();

  const loadMessages = useCallback(async () => {
    if (!phoneNumber) return;
    setLoading(true);
    try {
      const data = await getMessages(phoneNumber);
      setMessages(data.messages);
      setHasMore(data.has_more);
    } catch { /* handled by interceptor */ }
    setLoading(false);
  }, [phoneNumber]);

  useEffect(() => {
    setMessages([]);
    loadMessages();
  }, [loadMessages]);

  // Real-time: append new messages for the active conversation
  useEffect(() => {
    if (!lastEvent || !phoneNumber) return;

    if (lastEvent.type === "new_message" && lastEvent.phone_number === phoneNumber) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === lastEvent.message.id)) return prev;
        return [...prev, lastEvent.message];
      });
    }

    if (lastEvent.type === "message_status") {
      setMessages((prev) =>
        prev.map((m) =>
          m.whatsapp_message_id === lastEvent.whatsapp_message_id
            ? { ...m, status: lastEvent.status }
            : m
        )
      );
    }
  }, [lastEvent, phoneNumber]);

  // Optimistically add a message (used after sending from dashboard)
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  return { messages, loading, hasMore, refresh: loadMessages, addMessage };
}

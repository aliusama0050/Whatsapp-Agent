import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { WSEvent } from "../types";

interface WSCtx {
  lastEvent: WSEvent | null;
  connected: boolean;
}

const WebSocketContext = createContext<WSCtx>({ lastEvent: null, connected: false });

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backoff = useRef(1000);

  const connect = useCallback(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      // External API: convert https://host/api → wss://host/ws/messages
      wsUrl = apiUrl.replace(/^http/, "ws").replace(/\/api\/?$/, "/ws/messages");
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws/messages`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send auth as first message (avoids token in URL/logs)
      ws.send(JSON.stringify({ type: "auth", token }));
      setConnected(true);
      backoff.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data: WSEvent = JSON.parse(event.data);
        setLastEvent(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeout.current = setTimeout(() => {
        backoff.current = Math.min(backoff.current * 2, 30000);
        connect();
      }, backoff.current);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    // Ping every 30s to keep alive
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ lastEvent, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}

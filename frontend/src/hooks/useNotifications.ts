import { useState, useCallback, useEffect } from "react";

type Permission = "default" | "granted" | "denied";

export function useNotifications() {
  const [permission, setPermission] = useState<Permission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // Auto-request on first mount if still "default"
  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const notify = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (permission !== "granted") return;
      if (!document.hidden) return; // Only notify when tab is not focused

      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "hsq-message", // Replaces previous notification
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    },
    [permission]
  );

  return { permission, requestPermission, notify };
}

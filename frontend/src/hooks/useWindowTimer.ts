import { useState, useEffect } from "react";

export function useWindowTimer(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [urgency, setUrgency] = useState<"ok" | "warning" | "critical" | "expired">("ok");

  useEffect(() => {
    if (!expiresAt) {
      setRemaining("No window");
      setIsExpired(true);
      setUrgency("expired");
      return;
    }

    const update = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setRemaining("Expired");
        setIsExpired(true);
        setUrgency("expired");
        return;
      }

      setIsExpired(false);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      setRemaining(`${hours}h ${minutes}m`);

      if (diff < 1800000) setUrgency("critical");       // < 30 min
      else if (diff < 7200000) setUrgency("warning");    // < 2 hours
      else setUrgency("ok");
    };

    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { remaining, isExpired, urgency };
}

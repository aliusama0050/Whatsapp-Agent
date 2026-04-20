import { useWindowTimer } from "../../hooks/useWindowTimer";
import { Clock } from "lucide-react";

interface Props {
  expiresAt: string | null;
}

export default function WindowTimer({ expiresAt }: Props) {
  const { remaining, urgency } = useWindowTimer(expiresAt);

  const colors = {
    ok: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
    expired: "text-zinc-400",
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${colors[urgency]}`}>
      <Clock className="h-3 w-3" />
      <span>{remaining}</span>
    </div>
  );
}

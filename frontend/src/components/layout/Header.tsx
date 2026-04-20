import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import GlobalSearch from "../search/GlobalSearch";
import { LogOut, Moon, Sun, Wifi, WifiOff, Settings, Bell, BellOff, BarChart3, Search, ShieldCheck } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const { permission, requestPermission } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">HSQ Towers</h1>
        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          WhatsApp
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(true)}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </button>

        {connected ? (
          <Wifi className="h-4 w-4 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}

        <button
          onClick={permission !== "granted" ? requestPermission : undefined}
          className={`rounded-lg p-2 transition-colors ${
            permission === "granted"
              ? "text-emerald-500"
              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title={permission === "granted" ? "Notifications enabled" : "Enable notifications"}
        >
          {permission === "granted" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>

        <button onClick={toggle} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={() => navigate("/analytics")}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Analytics"
        >
          <BarChart3 className="h-4 w-4" />
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {user?.role === "admin" && (
          <button
            onClick={() => navigate("/admin")}
            className="rounded-lg p-2 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Admin Panel"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
        )}

        <span className="text-sm text-zinc-500 dark:text-zinc-400">{user?.username}</span>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

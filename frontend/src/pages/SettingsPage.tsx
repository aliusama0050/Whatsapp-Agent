import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import CannedResponseManager from "../components/settings/CannedResponseManager";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 hidden md:block">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Settings</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 px-3">Quick Replies</p>
        </div>

        {/* Mobile back button */}
        <div className="md:hidden absolute top-16 left-2 z-10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
          <CannedResponseManager />
        </div>
      </div>
    </div>
  );
}

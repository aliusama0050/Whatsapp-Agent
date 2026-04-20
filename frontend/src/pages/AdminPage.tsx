import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import AdminDashboard from "../components/admin/AdminDashboard";
import UserManager from "../components/settings/UserManager";
import AIPromptEditor from "../components/settings/AIPromptEditor";
import CannedResponseManager from "../components/settings/CannedResponseManager";
import SystemSettings from "../components/admin/SystemSettings";
import AuditLog from "../components/admin/AuditLog";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  Server,
  ScrollText,
} from "lucide-react";

const TABS = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "users" as const, label: "Users", icon: Users },
  { id: "ai-config" as const, label: "AI Config", icon: Bot },
  { id: "canned" as const, label: "Quick Replies", icon: MessageSquare },
  { id: "system" as const, label: "System", icon: Server },
  { id: "audit" as const, label: "Audit Log", icon: ScrollText },
];

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
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

          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Admin Panel
          </h2>
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tab selector */}
        <div className="md:hidden flex items-center gap-1 p-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 w-full absolute top-14 z-10">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-zinc-200 dark:bg-zinc-800 p-1.5 text-zinc-500 flex-shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                  : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl md:mt-0 mt-10">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "users" && <UserManager />}
          {activeTab === "ai-config" && <AIPromptEditor />}
          {activeTab === "canned" && <CannedResponseManager />}
          {activeTab === "system" && <SystemSettings />}
          {activeTab === "audit" && <AuditLog />}
        </div>
      </div>
    </div>
  );
}

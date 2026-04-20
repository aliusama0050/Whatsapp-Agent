import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from "../../services/userApi";
import type { UserDetail } from "../../services/userApi";
import { useAuth } from "../../contexts/AuthContext";
import { Plus, Pencil, Trash2, Key, X, Save, Shield, UserIcon } from "lucide-react";

export default function UserManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // null=closed, "new", or userId
  const [form, setForm] = useState({ username: "", password: "", role: "agent" });
  const [resetForm, setResetForm] = useState<{ userId: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ username: "", password: "", role: "agent" });
    setEditing("new");
    setError("");
  };

  const openEdit = (u: UserDetail) => {
    setForm({ username: u.username, password: "", role: u.role });
    setEditing(u.id);
    setError("");
  };

  const handleSave = async () => {
    if (!form.username.trim()) { setError("Username is required"); return; }
    if (editing === "new" && !form.password.trim()) { setError("Password is required"); return; }

    setSaving(true);
    setError("");
    try {
      if (editing === "new") {
        await createUser({ username: form.username, password: form.password, role: form.role });
      } else {
        const updates: Record<string, string | boolean> = {};
        const orig = users.find((u) => u.id === editing);
        if (orig && form.username !== orig.username) updates.username = form.username;
        if (orig && form.role !== orig.role) updates.role = form.role;
        if (Object.keys(updates).length > 0) await updateUser(editing!, updates);
      }
      await load();
      setEditing(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete");
    }
  };

  const handleResetPassword = async () => {
    if (!resetForm || !resetForm.password.trim()) { setError("Password is required"); return; }
    setSaving(true);
    try {
      await resetPassword(resetForm.userId, resetForm.password);
      setResetForm(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserDetail) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update");
    }
  };

  if (loading) return <div className="p-6 text-center text-zinc-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">User Management</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage dashboard agents and administrators
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create/Edit form */}
      {editing && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {editing === "new" ? "New User" : "Edit User"}
            </h4>
            <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {editing === "new" && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Reset password form */}
      {resetForm && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Reset Password</h4>
          <input
            type="password"
            value={resetForm.password}
            onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
            placeholder="New password"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setResetForm(null)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Key className="h-3.5 w-3.5" />
              {saving ? "Resetting..." : "Reset"}
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-1.5">
        {users.map((u) => (
          <div
            key={u.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 group ${
              u.is_active
                ? "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
                : "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/20 opacity-60"
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
              u.role === "admin" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"
            }`}>
              {u.role === "admin" ? (
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{u.username}</span>
                <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full ${
                  u.role === "admin"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                }`}>
                  {u.role}
                </span>
                {!u.is_active && (
                  <span className="text-[10px] font-medium text-red-500">Disabled</span>
                )}
              </div>
            </div>

            {u.id !== currentUser?.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => toggleActive(u)}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    u.is_active
                      ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  }`}
                >
                  {u.is_active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => openEdit(u)} className="rounded-md p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setResetForm({ userId: u.id, password: "" })}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  title="Reset password"
                >
                  <Key className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

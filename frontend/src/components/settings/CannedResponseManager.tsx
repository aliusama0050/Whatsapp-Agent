import { useState, useEffect } from "react";
import {
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
} from "../../services/cannedResponseApi";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import type { CannedResponse } from "../../types";

const CATEGORIES = ["General", "Greeting", "Pricing", "Booking", "Support", "Closing"];

interface FormState {
  shortcut: string;
  title: string;
  body: string;
  category: string;
}

const emptyForm: FormState = { shortcut: "", title: "", body: "", category: "General" };

export default function CannedResponseManager() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // null=closed, "new"=creating, id=editing
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getCannedResponses();
      setResponses(data);
    } catch {
      setError("Failed to load canned responses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditing("new");
    setError("");
  };

  const openEdit = (r: CannedResponse) => {
    setForm({ shortcut: r.shortcut, title: r.title, body: r.body, category: r.category });
    setEditing(r.id);
    setError("");
  };

  const closeForm = () => {
    setEditing(null);
    setError("");
  };

  const handleSave = async () => {
    if (!form.shortcut.trim() || !form.title.trim() || !form.body.trim()) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing === "new") {
        await createCannedResponse(form);
      } else {
        await updateCannedResponse(editing!, form);
      }
      await load();
      closeForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this canned response?")) return;
    try {
      await deleteCannedResponse(id);
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete");
    }
  };

  // Group by category
  const grouped: Record<string, CannedResponse[]> = {};
  const safeResponses = Array.isArray(responses) ? responses : [];
  for (const r of safeResponses) {
    (grouped[r.category] ??= []).push(r);
  }

  if (loading) {
    return <div className="p-6 text-center text-zinc-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Canned Responses</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Quick replies triggered by typing "/" in the message input
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Response
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
              {editing === "new" ? "New Response" : "Edit Response"}
            </h4>
            <button onClick={closeForm} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Shortcut</label>
              <div className="flex items-center">
                <span className="text-sm text-zinc-400 mr-1">/</span>
                <input
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/\s/g, "").toLowerCase() })}
                  placeholder="greeting"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Friendly greeting"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hello! Thank you for reaching out to HSQ Towers..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={closeForm}
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

      {/* Response list grouped by category */}
      {safeResponses.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-400">
          No canned responses yet. Create one to get started.
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">{category}</h4>
            <div className="space-y-1.5">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2.5 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">/{r.shortcut}</span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{r.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{r.body}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-md p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-md p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

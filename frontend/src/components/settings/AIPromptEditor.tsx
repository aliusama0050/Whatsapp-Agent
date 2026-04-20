import { useState, useEffect } from "react";
import { getAIConfig, updateAIConfig } from "../../services/aiConfigApi";
import type { KnowledgeEntry } from "../../services/aiConfigApi";
import { Save, RotateCcw, Plus, Trash2, BookOpen } from "lucide-react";

export default function AIPromptEditor() {
  const [prompt, setPrompt] = useState("");
  const [fallback, setFallback] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [defaults, setDefaults] = useState({ prompt: "", fallback: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAIConfig()
      .then((config) => {
        setPrompt(config.system_prompt);
        setFallback(config.fallback_message);
        setEntries(Array.isArray(config.knowledge_entries) ? config.knowledge_entries : []);
        setDefaults({
          prompt: config.default_system_prompt || config.system_prompt,
          fallback: config.default_fallback_message || config.fallback_message,
        });
      })
      .catch(() => setError("Failed to load AI config"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateAIConfig({
        system_prompt: prompt,
        fallback_message: fallback,
        knowledge_entries: entries,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Reset to default prompt? Your changes will be lost.")) return;
    setPrompt(defaults.prompt);
    setFallback(defaults.fallback);
  };

  const addEntry = () => {
    setEntries([...entries, { title: "", content: "" }]);
  };

  const updateEntry = (index: number, field: keyof KnowledgeEntry, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-6 text-center text-zinc-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Prompt Configuration</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customize the AI agent's personality, knowledge, and behavior
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          System Prompt
        </label>
        <p className="text-[11px] text-zinc-400 mb-2">
          This is the core personality and instructions for the AI agent. It controls how the agent responds to customers.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none resize-y"
        />
        <p className="mt-1 text-[10px] text-zinc-400">{prompt.length} characters</p>
      </div>

      {/* Fallback Message */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Fallback Message
        </label>
        <p className="text-[11px] text-zinc-400 mb-2">
          Sent when the AI fails to generate a response (e.g., API error).
        </p>
        <textarea
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none resize-y"
        />
      </div>

      {/* Knowledge Entries */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Knowledge Entries
            </label>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Extra facts appended to the prompt. Use for rates, policies, seasonal info, etc.
            </p>
          </div>
          <button
            onClick={addEntry}
            className="flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-[11px] text-zinc-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Entry
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-center">
            <BookOpen className="h-6 w-6 mx-auto mb-1 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs text-zinc-400">
              No knowledge entries yet. Add seasonal rates, policies, or FAQs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={entry.title}
                    onChange={(e) => updateEntry(i, "title", e.target.value)}
                    placeholder="Entry title (e.g., Winter Rates 2026)"
                    className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeEntry(i)}
                    className="rounded-md p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={entry.content}
                  onChange={(e) => updateEntry(i, "content", e.target.value)}
                  placeholder="Entry content..."
                  rows={3}
                  className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none resize-y"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

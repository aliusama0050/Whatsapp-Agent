import { useEffect, useState } from "react";
import { getTemplates, sendTemplate } from "../../services/templateApi";
import type { Template, Message } from "../../types";
import { X, Send, FileText, Loader2 } from "lucide-react";

interface Props {
  phoneNumber: string;
  onClose: () => void;
  onSent: (msg: Message) => void;
}

export default function TemplatePicker({ phoneNumber, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Template | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
      .catch(() => setError("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  // Extract {{N}} placeholders from a template's BODY component
  const getBodyComponent = (t: Template) =>
    t.components.find((c) => c.type === "BODY");

  const getPlaceholders = (t: Template): string[] => {
    const body = getBodyComponent(t);
    if (!body?.text) return [];
    const matches = body.text.match(/\{\{\d+\}\}/g);
    return matches || [];
  };

  const handleSelect = (t: Template) => {
    setSelected(t);
    setParams({});
    setError("");
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setError("");

    const placeholders = getPlaceholders(selected);
    // Check all params are filled
    for (const ph of placeholders) {
      if (!params[ph]?.trim()) {
        setError(`Please fill in all parameters`);
        setSending(false);
        return;
      }
    }

    // Build components array for the API
    const components: { type: string; parameters: { type: string; text: string }[] }[] = [];
    if (placeholders.length > 0) {
      components.push({
        type: "body",
        parameters: placeholders.map((ph) => ({
          type: "text",
          text: params[ph].trim(),
        })),
      });
    }

    try {
      const msg = await sendTemplate(phoneNumber, {
        template_name: selected.name,
        language_code: selected.language,
        components,
      });
      onSent(msg);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send template");
    }
    setSending(false);
  };

  // Preview the template body with filled params
  const getPreview = (t: Template): string => {
    const body = getBodyComponent(t);
    if (!body?.text) return "(No body text)";
    let text = body.text;
    for (const [key, val] of Object.entries(params)) {
      text = text.replace(key, val || key);
    }
    return text;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selected ? "Configure Template" : "Send Template Message"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : error && templates.length === 0 ? (
            <p className="text-center text-sm text-red-500 py-8">{error}</p>
          ) : !selected ? (
            /* Template list */
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-8">
                  No approved templates found. Create templates in the Meta Business dashboard.
                </p>
              ) : (
                templates.map((t) => (
                  <button
                    key={`${t.name}-${t.language}`}
                    onClick={() => handleSelect(t)}
                    className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name}</span>
                      <span className="ml-auto text-xs text-zinc-400">{t.language}</span>
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                        {t.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {getBodyComponent(t)?.text || "No body text"}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Template config + preview */
            <div className="space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-emerald-600 hover:underline"
              >
                &larr; Back to templates
              </button>

              {/* Preview card */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  PREVIEW
                </div>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                  {getPreview(selected)}
                </p>
              </div>

              {/* Parameter inputs */}
              {getPlaceholders(selected).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Fill in parameters:
                  </p>
                  {getPlaceholders(selected).map((ph, i) => (
                    <div key={ph}>
                      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        Parameter {i + 1} ({ph})
                      </label>
                      <input
                        type="text"
                        value={params[ph] || ""}
                        onChange={(e) => setParams((p) => ({ ...p, [ph]: e.target.value }))}
                        placeholder={`Value for ${ph}`}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer — send button when template is selected */}
        {selected && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Send Template"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

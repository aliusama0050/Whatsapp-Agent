import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { searchMessages, type SearchResult } from "../../services/searchApi";
import { Search, X, Loader2, MessageSquare } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setTotal(0);
      setSelected(0);
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else {
          // parent should open — this is handled via the onOpen callback in the header
        }
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await searchMessages(q.trim());
      setResults(res.results);
      setTotal(res.total);
      setSelected(0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigate(`/?phone=${result.phone_number}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="h-5 w-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading ? (
            <div className="p-6 text-center text-sm text-zinc-400">No messages found</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  i === selected
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <MessageSquare className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium">{r.customer_name || r.phone_number}</span>
                    <span>{r.phone_number}</span>
                    <span className="ml-auto">
                      {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate mt-0.5">
                    {r.body}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {total > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-400 flex items-center justify-between">
            <span>{total} result{total !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">↑↓</kbd>
              navigate
              <kbd className="ml-2 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">↵</kbd>
              select
            </span>
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">
            <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs font-mono">Ctrl+K</kbd>
            <span className="ml-2">to search messages across all conversations</span>
          </div>
        )}
      </div>
    </div>
  );
}

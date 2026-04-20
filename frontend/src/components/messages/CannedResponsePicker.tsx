import { useState, useEffect, useRef, useCallback } from "react";
import { getCannedResponses } from "../../services/cannedResponseApi";
import { MessageSquare } from "lucide-react";
import type { CannedResponse } from "../../types";

interface Props {
  filter: string;
  onSelect: (body: string) => void;
  onClose: () => void;
}

export default function CannedResponsePicker({ filter, onSelect, onClose }: Props) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [filtered, setFiltered] = useState<CannedResponse[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCannedResponses().then(setResponses).catch(() => {});
  }, []);

  useEffect(() => {
    const q = filter.toLowerCase();
    const matches = responses.filter(
      (r) =>
        r.shortcut.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
    );
    setFiltered(matches);
    setActiveIndex(0);
  }, [filter, responses]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onSelect(filtered[activeIndex].body);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg p-3">
        <p className="text-xs text-zinc-400 text-center">
          {responses.length === 0 ? "No canned responses yet" : "No matches found"}
        </p>
      </div>
    );
  }

  // Group by category
  const grouped: Record<string, CannedResponse[]> = {};
  for (const r of filtered) {
    const cat = r.category || "General";
    (grouped[cat] ??= []).push(r);
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg">
      <div ref={listRef}>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="sticky top-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 dark:bg-zinc-800/90">
              {category}
            </div>
            {items.map((r) => {
              const globalIdx = filtered.indexOf(r);
              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r.body)}
                  onMouseEnter={() => setActiveIndex(globalIdx)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                    globalIdx === activeIndex
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        /{r.shortcut}
                      </span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate">
                        {r.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{r.body}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

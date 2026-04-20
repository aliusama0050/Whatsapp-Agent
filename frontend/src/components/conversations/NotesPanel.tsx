import { useState, useEffect } from "react";
import { getNotes, addNote, deleteNote } from "../../services/conversationApi";
import { X, Send, Trash2 } from "lucide-react";
import type { Note } from "../../types";

interface Props {
  phoneNumber: string;
  onClose: () => void;
}

export default function NotesPanel({ phoneNumber, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotes(phoneNumber)
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phoneNumber]);

  const handleAdd = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const note = await addNote(phoneNumber, text.trim());
      setNotes((prev) => [...prev, note]);
      setText("");
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(phoneNumber, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {}
  };

  return (
    <div className="flex h-full w-72 flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-4">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30 p-2.5 group"
            >
              <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{note.text}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="text-[10px] text-zinc-400">
                  <span className="font-medium">{note.created_by_name}</span>
                  {" \u00b7 "}
                  {new Date(note.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-400 hover:text-red-500 transition-all"
                  title="Delete note"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-3">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add a note..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim() || saving}
            className="self-end flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

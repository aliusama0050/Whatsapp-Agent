import { useState } from "react";
import { updateTags } from "../../services/conversationApi";
import { X, Plus } from "lucide-react";

const TAG_OPTIONS = [
  { label: "Hot Lead", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { label: "Booking", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { label: "Complaint", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { label: "VIP", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { label: "Investment", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { label: "Follow Up", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
];

interface Props {
  phoneNumber: string;
  tags: string[];
  onTagsChanged: (tags: string[]) => void;
}

export default function TagManager({ phoneNumber, tags, onTagsChanged }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const getTagColor = (tag: string) => {
    return TAG_OPTIONS.find((t) => t.label === tag)?.color ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
  };

  const toggleTag = async (label: string) => {
    const newTags = tags.includes(label)
      ? tags.filter((t) => t !== label)
      : [...tags, label];

    try {
      const result = await updateTags(phoneNumber, newTags);
      onTagsChanged(result.tags);
    } catch {
      // Silently fail
    }
  };

  const removeTag = async (label: string) => {
    const newTags = tags.filter((t) => t !== label);
    try {
      const result = await updateTags(phoneNumber, newTags);
      onTagsChanged(result.tags);
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTagColor(tag)}`}
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:opacity-70">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
        >
          <Plus className="h-2.5 w-2.5 mr-0.5" />
          Tag
        </button>

        {showPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
            <div className="absolute top-full left-0 z-20 mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg p-1.5 min-w-[140px]">
              {TAG_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { toggleTag(opt.label); setShowPicker(false); }}
                  className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700 ${
                    tags.includes(opt.label) ? "opacity-50" : ""
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${opt.color.split(" ")[0]}`} />
                  <span className="text-zinc-700 dark:text-zinc-200">{opt.label}</span>
                  {tags.includes(opt.label) && <span className="ml-auto text-[10px] text-zinc-400">Added</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Compact tag dots for ConversationItem */
export function TagDots({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;

  const dotColor: Record<string, string> = {
    "Hot Lead": "bg-red-500",
    "Booking": "bg-blue-500",
    "Complaint": "bg-orange-500",
    "VIP": "bg-yellow-500",
    "Investment": "bg-purple-500",
    "Follow Up": "bg-teal-500",
  };

  return (
    <div className="flex gap-0.5">
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag}
          className={`h-1.5 w-1.5 rounded-full ${dotColor[tag] ?? "bg-zinc-400"}`}
          title={tag}
        />
      ))}
    </div>
  );
}

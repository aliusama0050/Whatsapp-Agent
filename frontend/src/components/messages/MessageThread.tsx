import { useEffect, useRef, useState } from "react";
import { useMessages } from "../../hooks/useMessages";
import { getConversation, markRead } from "../../services/conversationApi";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import AgentToggle from "../agent/AgentToggle";
import WindowTimer from "./WindowTimer";
import TagManager from "../conversations/TagManager";
import NotesPanel from "../conversations/NotesPanel";
import ContactProfile from "../contacts/ContactProfile";
import { useWindowTimer } from "../../hooks/useWindowTimer";
import { exportConversation } from "../../services/exportApi";
import { ArrowLeft, StickyNote, UserCircle, Download } from "lucide-react";
import type { Conversation } from "../../types";

interface Props {
  phoneNumber: string;
  onBack?: () => void;
}

export default function MessageThread({ phoneNumber, onBack }: Props) {
  const { messages, loading, addMessage } = useMessages(phoneNumber);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { isExpired } = useWindowTimer(conv?.window_expires_at ?? null);

  // Load conversation details
  useEffect(() => {
    getConversation(phoneNumber).then(setConv).catch(() => {});
    markRead(phoneNumber).catch(() => {});
  }, [phoneNumber]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAgentToggled = (newStatus: "ai_active" | "human_takeover") => {
    if (conv) setConv({ ...conv, agent_status: newStatus });
  };

  const handleTagsChanged = (tags: string[]) => {
    if (conv) setConv({ ...conv, tags });
  };

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header bar */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Back button — visible on mobile only */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {conv?.customer_name || phoneNumber}
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{phoneNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <WindowTimer expiresAt={conv?.window_expires_at ?? null} />
              <button
                onClick={() => { setShowContact(!showContact); if (!showContact) setShowNotes(false); }}
                className={`rounded-lg p-1.5 transition-colors ${
                  showContact
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Contact Info"
              >
                <UserCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setShowNotes(!showNotes); if (!showNotes) setShowContact(false); }}
                className={`rounded-lg p-1.5 transition-colors ${
                  showNotes
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Notes"
              >
                <StickyNote className="h-4 w-4" />
              </button>
              <button
                onClick={() => exportConversation(phoneNumber, "csv")}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              {conv && (
                <AgentToggle
                  phoneNumber={phoneNumber}
                  status={conv.agent_status}
                  onToggled={handleAgentToggled}
                />
              )}
            </div>
          </div>

          {/* Tags row */}
          {conv && (
            <div className="mt-1.5">
              <TagManager
                phoneNumber={phoneNumber}
                tags={conv.tags ?? []}
                onTagsChanged={handleTagsChanged}
              />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-zinc-400 p-8">No messages yet</div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <MessageInput
          phoneNumber={phoneNumber}
          disabled={isExpired}
          disabledReason={isExpired ? "24-hour window expired. Send a template message to re-engage." : undefined}
          onMessageSent={addMessage}
        />
      </div>

      {/* Side panels — only one visible at a time */}
      {showNotes && (
        <NotesPanel phoneNumber={phoneNumber} onClose={() => setShowNotes(false)} />
      )}
      {showContact && (
        <ContactProfile phoneNumber={phoneNumber} onClose={() => setShowContact(false)} />
      )}
    </div>
  );
}

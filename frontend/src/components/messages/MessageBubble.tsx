import { useState } from "react";
import type { Message } from "../../types";
import { Bot, User, Check, CheckCheck, AlertCircle, FileText, Download } from "lucide-react";
import MediaPreview from "./MediaPreview";

interface Props {
  message: Message;
}

const MEDIA_TYPES = new Set(["image", "video", "audio", "document", "sticker"]);

export default function MessageBubble({ message }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const isInbound = message.direction === "inbound";
  const isFailed = message.status === "failed";
  const isTemplate = message.message_type === "template";
  const isMedia = MEDIA_TYPES.has(message.message_type);

  const senderLabel = {
    customer: null,
    ai_agent: "AI Agent",
    human_agent: "You",
  }[message.sender_type];

  const statusIcon = !isInbound ? (
    isFailed ? (
      <AlertCircle className="h-3 w-3 text-red-400" />
    ) : message.status === "read" ? (
      <CheckCheck className="h-3 w-3 text-blue-500" />
    ) : message.status === "delivered" ? (
      <CheckCheck className="h-3 w-3 text-zinc-400" />
    ) : (
      <Check className="h-3 w-3 text-zinc-400" />
    )
  ) : null;

  const renderMediaContent = () => {
    const mediaUrl = message.media_url;
    if (!mediaUrl) return <p className="text-sm italic opacity-70">Media unavailable</p>;

    switch (message.message_type) {
      case "image":
        return (
          <img
            src={mediaUrl}
            alt="Image"
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowPreview(true)}
            loading="lazy"
          />
        );
      case "sticker":
        return (
          <img
            src={mediaUrl}
            alt="Sticker"
            className="max-w-[180px] cursor-pointer"
            onClick={() => setShowPreview(true)}
            loading="lazy"
          />
        );
      case "video":
        return (
          <video
            src={mediaUrl}
            controls
            className="max-w-full rounded-lg"
            preload="metadata"
          />
        );
      case "audio":
        return (
          <audio src={mediaUrl} controls className="w-full min-w-[200px]" preload="metadata" />
        );
      case "document":
        return (
          <a
            href={mediaUrl}
            download={message.filename || "document"}
            className={`flex items-center gap-2 rounded-lg p-2 ${
              isInbound
                ? "bg-zinc-200/50 dark:bg-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                : "bg-white/20 hover:bg-white/30"
            } transition-colors`}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{message.filename || "Document"}</p>
              <p className="text-[10px] opacity-70">{message.mime_type}</p>
            </div>
            <Download className="h-4 w-4 flex-shrink-0" />
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
            isFailed
              ? "bg-red-600/80 text-white"
              : isMedia && message.message_type === "sticker"
                ? "" // stickers get no background
                : isInbound
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : message.sender_type === "ai_agent"
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
          }`}
        >
          {/* Sender label for outbound */}
          {senderLabel && (
            <div className={`mb-1 flex items-center gap-1 text-[10px] ${
              isInbound ? "text-zinc-500" : "text-white/70"
            }`}>
              {message.sender_type === "ai_agent" ? (
                <Bot className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {senderLabel}
            </div>
          )}

          {/* Media content */}
          {isMedia ? (
            <div className="space-y-1">
              {renderMediaContent()}
              {message.body && (
                <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.body}</p>
              )}
            </div>
          ) : isTemplate ? (
            /* Template message */
            <div className="space-y-1">
              <div className={`flex items-center gap-1 text-[10px] font-medium ${
                isInbound ? "text-zinc-500" : "text-white/70"
              }`}>
                <FileText className="h-3 w-3" />
                Template: {message.template_name || "Unknown"}
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
            </div>
          ) : (
            /* Regular text */
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isInbound ? "text-zinc-400" : "text-white/60"
          }`}>
            {isFailed && <span className="text-red-200 font-medium mr-1">Failed</span>}
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {statusIcon}
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {showPreview && message.media_url && (
        <MediaPreview src={message.media_url} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}

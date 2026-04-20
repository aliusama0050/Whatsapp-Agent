import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { sendMessage } from "../../services/messageApi";
import { sendMedia } from "../../services/mediaApi";
import { Send, FileText, Paperclip, X, Image, Film, Music, File } from "lucide-react";
import TemplatePicker from "./TemplatePicker";
import CannedResponsePicker from "./CannedResponsePicker";
import type { Message } from "../../types";

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB — WhatsApp limit

interface Props {
  phoneNumber: string;
  disabled: boolean;
  disabledReason?: string;
  onMessageSent?: (msg: Message) => void;
}

export default function MessageInput({ phoneNumber, disabled, disabledReason, onMessageSent }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(phoneNumber, text.trim());
      setText("");
      onMessageSent?.(msg);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send message");
    }
    setSending(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    // Detect "/" at the start of the input to trigger canned response picker
    if (value.startsWith("/")) {
      setShowCannedPicker(true);
      setCannedFilter(value.slice(1)); // everything after "/"
    } else {
      setShowCannedPicker(false);
    }
  };

  const handleCannedSelect = (body: string) => {
    setText(body);
    setShowCannedPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let the canned picker handle arrow/enter/escape keys
    if (showCannedPicker && ["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(e.key)) {
      return; // CannedResponsePicker handles these via window listener
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 16 MB.");
      return;
    }

    setSelectedFile(file);
    setCaption("");

    // Generate preview for images/videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const clearFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCaption("");
  };

  const handleSendMedia = async () => {
    if (!selectedFile || sending) return;
    setSending(true);
    try {
      const msg = await sendMedia(phoneNumber, selectedFile, caption.trim() || undefined);
      clearFile();
      onMessageSent?.(msg);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send media");
    }
    setSending(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (file.type.startsWith("video/")) return <Film className="h-5 w-5" />;
    if (file.type.startsWith("audio/")) return <Music className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 24h window expired — only allow template messages
  if (disabled) {
    return (
      <>
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            {disabledReason || "Cannot send messages"}
          </p>
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Send Template Message
          </button>
        </div>
        {showTemplatePicker && (
          <TemplatePicker
            phoneNumber={phoneNumber}
            onClose={() => setShowTemplatePicker(false)}
            onSent={(msg) => onMessageSent?.(msg)}
          />
        )}
      </>
    );
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* File preview bar */}
      {selectedFile && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3">
            {/* Thumbnail or icon */}
            {filePreviewUrl && selectedFile.type.startsWith("image/") ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : filePreviewUrl && selectedFile.type.startsWith("video/") ? (
              <video
                src={filePreviewUrl}
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                {getFileIcon(selectedFile)}
              </div>
            )}

            {/* File info + caption input */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatFileSize(selectedFile.size)}
              </p>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="mt-1 w-full text-xs bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 placeholder-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMedia();
                  }
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 gap-1">
              <button
                onClick={clearFile}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={handleSendMedia}
                disabled={sending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                title="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main input row */}
      <div className="relative flex items-end gap-2 p-3">
        {/* Canned response picker (positioned above input) */}
        {showCannedPicker && (
          <CannedResponsePicker
            filter={cannedFilter}
            onSelect={handleCannedSelect}
            onClose={() => setShowCannedPicker(false)}
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (/ for quick replies)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

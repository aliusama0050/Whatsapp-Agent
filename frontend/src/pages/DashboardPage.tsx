import { useState } from "react";
import Header from "../components/layout/Header";
import StatsBar from "../components/dashboard/StatsBar";
import ConversationList from "../components/conversations/ConversationList";
import MessageThread from "../components/messages/MessageThread";
import { MessageSquareText } from "lucide-react";

export default function DashboardPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <Header />
      <StatsBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Conversation list — hidden on mobile when a conversation is open */}
        <div className={`w-full md:w-80 md:flex-shrink-0 xl:w-96 ${
          selectedPhone ? "hidden md:block" : "block"
        }`}>
          <ConversationList selectedPhone={selectedPhone} onSelect={setSelectedPhone} />
        </div>

        {/* Right: Message thread — full-width on mobile */}
        <div className={`flex-1 ${
          selectedPhone ? "block" : "hidden md:block"
        }`}>
          {selectedPhone ? (
            <MessageThread
              key={selectedPhone}
              phoneNumber={selectedPhone}
              onBack={() => setSelectedPhone(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <MessageSquareText className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm mt-1">Choose from the list to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

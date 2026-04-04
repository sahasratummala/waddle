import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import type { Message } from "@waddle/shared";

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string | undefined;
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({
  messages,
  currentUserId,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput("");
  }

  return (
    <div className="card flex flex-col h-72">
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-forest/8">
        <MessageSquare className="w-4 h-4 text-ocean" />
        <span className="text-sm font-bold text-forest">Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-forest/30 text-xs text-center mt-4 font-medium">
            No messages yet. Say hi to your flock!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            if (msg.type === "SYSTEM") {
              return (
                <p key={msg.id} className="text-forest/30 text-xs text-center italic font-medium">
                  {msg.content}
                </p>
              );
            }
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-forest/40 text-xs mb-0.5 px-1 font-medium">{msg.username}</span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl text-sm max-w-[80%] break-words font-medium ${isMe
                      ? "bg-avocado text-white rounded-tr-sm"
                      : "bg-cream text-forest rounded-tl-sm"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-3 border-t-2 border-forest/8 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message your flock..."
          maxLength={500}
          className="flex-1 bg-cream border-2 border-forest/10 rounded-xl px-3 py-2 text-sm text-forest placeholder-forest/30 focus:outline-none focus:border-avocado transition-colors font-medium"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-avocado/10 hover:bg-avocado/20 disabled:opacity-30 disabled:cursor-not-allowed text-avocado flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
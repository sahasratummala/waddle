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
    <div className="bg-background-card border border-white/10 rounded-2xl flex flex-col h-72">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
        <MessageSquare className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium text-white">Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-white/30 text-xs text-center mt-4">
            No messages yet. Say hi to your flock!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            if (msg.type === "SYSTEM") {
              return (
                <p key={msg.id} className="text-white/30 text-xs text-center italic">
                  {msg.content}
                </p>
              );
            }
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-white/40 text-xs mb-0.5 px-1">{msg.username}</span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl text-sm max-w-[80%] break-words ${
                    isMe
                      ? "bg-primary/20 text-white rounded-tr-sm"
                      : "bg-white/8 text-white/90 rounded-tl-sm"
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

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/8 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message your flock..."
          maxLength={500}
          className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-primary/20 hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

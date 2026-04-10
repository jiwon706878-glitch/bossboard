"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TAB_LABELS: Record<string, string> = {
  wiki: "Wiki AI",
  board: "Board AI",
  calendar: "Calendar AI",
  checklist: "Checklist AI",
  todo: "Todo AI",
};

interface TabAIChatProps {
  tab: string;
  context?: Record<string, unknown>;
}

export function TabAIChat({ tab, context }: TabAIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  // Reset messages when tab changes
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [tab]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/tab-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, message: trimmed, context }),
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errText || "Something went wrong." },
        ]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const label = TAB_LABELS[tab] ?? "AI";

  return (
    <>
      {/* Floating button — hidden on mobile */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2 px-4 py-2.5 rounded-md
            bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]
            hover:bg-[var(--bg-tertiary)] transition-colors duration-150 shadow-none"
          aria-label={`Open ${label}`}
        >
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-medium font-[var(--font-body)]">
            {label}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col
            w-[400px] h-[500px] rounded-md border border-[var(--border)]
            bg-[var(--bg-primary)] animate-slide-up overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)] font-[var(--font-display)]">
                {label}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors duration-150"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mt-16">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-tertiary)]">
                  Ask anything about your {tab}.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-md text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2 rounded-md">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] px-3 py-3 bg-[var(--bg-secondary)]">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none bg-[var(--bg-primary)] border border-[var(--border)] rounded-md
                  px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                  focus:outline-none focus:border-[var(--accent)] transition-colors duration-150
                  max-h-24 overflow-y-auto"
              />
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-md bg-[var(--accent)] text-white
                    hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors duration-150"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-[var(--text-tertiary)] font-[var(--font-mono)]">
                  1 credit
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

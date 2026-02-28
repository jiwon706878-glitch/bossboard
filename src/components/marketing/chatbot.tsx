"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";

function getTextContent(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
        <p className="font-medium">Thank you!</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-3 rounded-lg border bg-muted/50 p-4"
    >
      <p className="text-sm font-medium">Contact us</p>
      <input
        type="text"
        placeholder="Name"
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="email"
        placeholder="Email"
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        placeholder="Message"
        required
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <Button type="submit" size="sm" className="w-full gap-2">
        Send <ArrowRight className="h-3 w-3" />
      </Button>
    </form>
  );
}

const chatTransport = new DefaultChatTransport({
  api: "/api/ai/chat",
});

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat({ transport: chatTransport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const showContactForm = (text: string) =>
    text.includes("[SHOW_CONTACT_FORM]");

  const cleanContent = (text: string) =>
    text.replace("[SHOW_CONTACT_FORM]", "").trim();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-[calc(100vw-3rem)] flex-col rounded-xl border bg-background shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">BossBoard AI</p>
              <p className="text-xs text-muted-foreground">
                Ask us anything
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Hi! I&apos;m BossBoard&apos;s AI assistant. Ask me anything
                about our features, pricing, or how to get started.
              </div>
            )}

            {messages.map((m) => {
              const text = getTextContent(m);
              return (
                <div key={m.id}>
                  <div
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm"
                    }
                  >
                    {m.role === "assistant" ? cleanContent(text) : text}
                  </div>
                  {m.role === "assistant" && showContactForm(text) && (
                    <div className="mt-3 max-w-[80%]">
                      <ContactForm />
                    </div>
                  )}
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={isLoading || !input.trim()}
              className="h-8 w-8 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

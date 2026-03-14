"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, ArrowRight, Bot, Mail, Bug } from "lucide-react";

// ---------------------------------------------------------------------------
// FAQ keyword matching
// ---------------------------------------------------------------------------

const faqEntries = [
  {
    keywords: ["price", "pricing", "cost", "plan", "plans", "subscription"],
    response:
      "BossBoard offers 4 plans:\n\n\u2022 Free: $0/mo (5 SOPs, 5 AI generations)\n\u2022 Starter: $19/mo (50 SOPs, 50 AI generations)\n\u2022 Pro: $49/mo (unlimited SOPs & AI generations)\n\u2022 Business: $129/mo (everything in Pro + unlimited team, API, SSO)\n\nNo credit card required for the free plan!",
  },
  {
    keywords: ["cancel", "refund", "unsubscribe"],
    response:
      "You can cancel your subscription anytime from your account settings \u2014 no questions asked. Your plan stays active until the end of your billing period, and you won\u2019t be charged again.",
  },
  {
    keywords: ["free", "trial", "try"],
    response:
      "Our free plan includes 5 SOPs, 3 team members, and 5 AI generations per month \u2014 no credit card required! That\u2019s enough to create your first procedures and see how BossBoard works for your team.",
  },
  {
    keywords: ["credit", "credits", "generation", "generations"],
    response:
      "AI generations are how BossBoard measures AI usage. Each SOP generation costs 3 credits. Free users get 5/month, Starter gets 50/month, and Pro/Business get unlimited.",
  },
  {
    keywords: ["feature", "features", "what can", "do", "does", "tool", "tools"],
    response:
      "BossBoard helps you:\n\n1. Generate SOPs with AI \u2014 describe a topic and get a complete procedure in seconds\n2. Manage your team \u2014 invite members, track who read what, assign checklists\n3. Get AI insights \u2014 see which SOPs need review and track team compliance\n\nPlus: version history, onboarding paths, and a searchable SOP wiki.",
  },
  {
    keywords: ["how", "work", "start", "get started", "sign up", "begin", "sop"],
    response:
      "Getting started is easy:\n\n1. Sign up free (30 seconds, no credit card)\n2. Set up your business profile\n3. Create your first SOP with AI \u2014 just describe the topic!\n\nYour AI-generated SOP will include purpose, step-by-step procedures, safety notes, and an extractable checklist.",
  },
];

function matchFaq(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of faqEntries) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response;
    }
  }
  return "I\u2019m not sure about that. Choose an option below or try rephrasing your question!";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}`;
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          message: fd.get("message"),
        }),
      });
    } catch {
      // still show success — message is best-effort
    }
    setSending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
        <p className="font-medium">Message sent!</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-muted/50 p-4">
      <p className="text-sm font-medium">Contact Support</p>
      <input
        name="name"
        type="text"
        placeholder="Name"
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        name="message"
        placeholder="Message"
        required
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <Button type="submit" size="sm" className="w-full gap-2" disabled={sending}>
        {sending ? "Sending..." : "Send"} <ArrowRight className="h-3 w-3" />
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Bug report form
// ---------------------------------------------------------------------------

function BugReportForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    const description = fd.get("description") as string;
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bug Report",
          email: "bug@bossboard.app",
          message: `[BossBoard Bug] ${title}\n\n${description}`,
          subject: `[BossBoard Bug] ${title}`,
        }),
      });
    } catch {
      // best-effort
    }
    setSending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm">
        <p className="font-medium">Bug reported!</p>
        <p className="mt-1 text-muted-foreground">
          Thanks for letting us know. We&apos;ll look into it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-muted/50 p-4">
      <p className="text-sm font-medium">Report a Bug</p>
      <input
        name="title"
        type="text"
        placeholder="Bug title"
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        name="description"
        placeholder="What happened? What did you expect?"
        required
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <Button type="submit" size="sm" className="w-full gap-2" disabled={sending}>
        {sending ? "Sending..." : "Submit Bug"} <ArrowRight className="h-3 w-3" />
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main chatbot
// ---------------------------------------------------------------------------

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showContact, showBugReport]);

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  // FAQ submit
  function handleFaqSubmit(text: string) {
    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
    const answer = matchFaq(text);
    const botMsg: ChatMessage = { id: nextId(), role: "assistant", content: answer };
    addMessages(userMsg, botMsg);
  }

  // AI submit
  async function handleAiSubmit(text: string) {
    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
    addMessages(userMsg);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 401) {
        addMessages({
          id: nextId(),
          role: "assistant",
          content: "Please sign in to use the AI Assistant. You can create a free account in 30 seconds!",
        });
        setAiMode(false);
      } else if (res.status === 403) {
        addMessages({
          id: nextId(),
          role: "assistant",
          content: "Upgrade to Pro to use the AI Assistant. Available on Pro and Business plans.",
        });
        setAiMode(false);
      } else if (res.ok) {
        const data = await res.json();
        addMessages({
          id: nextId(),
          role: "assistant",
          content: data.reply,
        });
      } else {
        addMessages({
          id: nextId(),
          role: "assistant",
          content: "Something went wrong. Please try again later.",
        });
      }
    } catch {
      addMessages({
        id: nextId(),
        role: "assistant",
        content: "Connection error. Please try again.",
      });
    }
    setIsLoading(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setShowContact(false);
    setShowBugReport(false);

    if (aiMode) {
      handleAiSubmit(text);
    } else {
      handleFaqSubmit(text);
    }
  }

  function handleAiClick() {
    setShowContact(false);
    setShowBugReport(false);
    setAiMode(true);
    addMessages({
      id: nextId(),
      role: "assistant",
      content: "You\u2019re now chatting with our AI assistant. Type your question below. (1 credit per message)",
    });
  }

  function handleContactClick() {
    setAiMode(false);
    setShowBugReport(false);
    setShowContact(true);
    addMessages({
      id: nextId(),
      role: "assistant",
      content: "Fill out the form below and we\u2019ll get back to you!",
    });
  }

  function handleBugClick() {
    setAiMode(false);
    setShowContact(false);
    setShowBugReport(true);
    addMessages({
      id: nextId(),
      role: "assistant",
      content: "Sorry to hear that! Describe the bug below and we\u2019ll fix it.",
    });
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground border border-border transition-colors duration-150"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[calc(100vw-3rem)] flex-col rounded-xl border bg-background sm:w-96">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">BossBoard Help</p>
              <p className="text-xs text-muted-foreground">
                {aiMode ? "AI Assistant (1 credit/msg)" : "Ask us anything"}
              </p>
            </div>
            {aiMode && (
              <button
                onClick={() => setAiMode(false)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Back to FAQ
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome */}
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Hi! Ask me anything about BossBoard &mdash; pricing, features,
                how to get started, and more.
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line"
                }
              >
                {m.content}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            )}

            {/* Inline contact form */}
            {showContact && (
              <div className="max-w-[90%]">
                <ContactForm />
              </div>
            )}

            {/* Inline bug report form */}
            {showBugReport && (
              <div className="max-w-[90%]">
                <BugReportForm />
              </div>
            )}
          </div>

          {/* Action buttons — always visible */}
          <div className="flex gap-2 border-t px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 px-2 text-xs"
              onClick={handleAiClick}
              disabled={aiMode}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              AI Assistant
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 px-2 text-xs"
              onClick={handleContactClick}
              disabled={showContact}
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              Contact
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 px-2 text-xs"
              onClick={handleBugClick}
              disabled={showBugReport}
            >
              <Bug className="h-3.5 w-3.5 shrink-0" />
              Report Bug
            </Button>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-4 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={aiMode ? "Ask the AI anything..." : "Type a question..."}
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

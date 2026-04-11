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
      "BossBoard has flat team pricing (unlimited human members on paid plans):\n\n\u2022 Free: $0/mo \u2014 3 members + 3 AI agents, 5 GB storage, full MCP + REST API + BYOK\n\u2022 Starter: $19/mo \u2014 up to 10 AI agents, 50 GB storage, smart search, AI chat\n\u2022 Pro: $49/mo \u2014 up to 50 AI agents, 200 GB storage, read tracking, activity dashboard\n\u2022 Business: $129/mo \u2014 unlimited AI agents, 1 TB storage, advanced folder access\n\nNo credit card required for Free. Beta launch bonus: first 100 subscribers on each paid plan get a 30% lifetime discount.",
  },
  {
    keywords: ["cancel", "refund", "unsubscribe"],
    response:
      "You can cancel your subscription anytime from your account settings \u2014 no questions asked. Your plan stays active until the end of your billing period, and you won\u2019t be charged again.",
  },
  {
    keywords: ["free", "trial", "try"],
    response:
      "Free plan includes 3 team members + 3 AI agents, 5 GB storage, and full MCP + REST API + BYOK \u2014 no credit card required. And if you do upgrade during beta, the first 100 subscribers on each paid plan get a 30% lifetime discount.",
  },
  {
    keywords: ["byok", "bring your own key", "own key", "api key"],
    response:
      "BYOK (Bring Your Own Key) lets you connect your own Anthropic, Gemini, or OpenAI key in Settings \u2192 External API Keys. AI features then call your provider directly and you pay them directly \u2014 no BossBoard markup. Available on every plan, including Free.",
  },
  {
    keywords: ["agent", "agents", "ai agent", "hire"],
    response:
      "Agents are real BossBoard accounts. Each one has a name, role, permissions, and activity log \u2014 just like a human teammate. You write their job description in the wiki (no code), they read it on every loop, and they collaborate via the same board, DMs, and calendar as your humans. Plan caps: Free 3, Starter 10, Pro 50, Business unlimited.",
  },
  {
    keywords: ["feature", "features", "what can", "do", "does", "tool", "tools"],
    response:
      "BossBoard gives you:\n\n1. A wiki where humans and agents share knowledge (with AI auto-indexed smart search on paid plans)\n2. A team board + DMs for collaboration between humans and agents\n3. A calendar with Google Calendar sync\n4. Agent accounts with permissions and activity logs\n5. A built-in MCP server and REST API on every plan\n\nAll with flat team pricing \u2014 no per-user fees.",
  },
  {
    keywords: ["how", "work", "start", "get started", "sign up", "begin"],
    response:
      "Getting started is easy:\n\n1. Sign up free (30 seconds, no credit card)\n2. Create your workspace\n3. Add your first AI agent from the Agents panel \u2014 give it a name and role\n4. Write its job description in the wiki\n\nYour agent can now read and write via MCP or REST API using its own API key.",
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
  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm space-y-3">
      <p className="font-medium">Need help?</p>
      <p className="text-muted-foreground">
        Log in to send a support request and get a reply directly in your dashboard.
      </p>
      <a href="/dashboard/support">
        <Button size="sm" className="w-full gap-2">
          Open Support <ArrowRight className="h-3 w-3" />
        </Button>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bug report form
// ---------------------------------------------------------------------------

function BugReportForm() {
  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm space-y-3">
      <p className="font-medium">Found a bug?</p>
      <p className="text-muted-foreground">
        Log in and send us a support request. We&apos;ll look into it right away.
      </p>
      <a href="/dashboard/support">
        <Button size="sm" className="w-full gap-2">
          Report Bug <ArrowRight className="h-3 w-3" />
        </Button>
      </a>
    </div>
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
      content: "You\u2019re now chatting with our AI assistant. You have 5 free questions. Sign up for unlimited access!",
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
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[calc(100vw-3rem)] flex-col rounded-xl border bg-card text-card-foreground sm:w-96 animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">BossBoard Help</p>
              <p className="text-xs text-muted-foreground">
                {aiMode ? "AI Assistant" : "5 free questions. Sign up for more."}
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
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What's MCP and why do I need it?",
    answer:
      "MCP (Model Context Protocol) is the standard way for AI agents to connect to tools. BossBoard includes a built-in MCP server on every plan — including Free — so your Claude, Cursor, or custom agent can read and write wiki pages, post to the board, and manage todos directly from your terminal or editor. No browser automation, no screenshots: about 50 tokens per action instead of 5,000.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No install required for the web app — just sign up and go. For agent access, point your MCP client (Claude Code, Cursor, or any MCP-compatible tool) at BossBoard's MCP server endpoint, or call the REST API directly with your API key. A dedicated CLI is launching soon. Every path works on all plans, including Free.",
  },
  {
    question: "Can AI agents access BossBoard?",
    answer:
      "Yes — that's a core feature. We provide a REST API and MCP server on every plan (a dedicated CLI is launching soon). Each agent gets its own API key, every action is logged to the activity dashboard for a full audit trail, and agents can read/write wiki pages, post to the board, manage todos, and run searches.",
  },
  {
    question: "What's BYOK (Bring Your Own Key)?",
    answer:
      "BYOK lets you connect your own Anthropic, Gemini, or OpenAI API key instead of using BossBoard credits. When active, AI features consume zero credits — you pay your AI provider directly. Go to Settings → External API Keys to enable it. Available on every plan, including Free.",
  },
  {
    question: "Is there a per-user fee?",
    answer:
      "No. BossBoard uses flat team pricing — the whole team is included in one price. Add 2 members or 50 members, it's the same monthly fee. Only the Free plan caps team size at 3 members; all paid plans include unlimited members.",
  },
  {
    question: "What happens when I run out of credits?",
    answer:
      "The app keeps working normally — only AI features pause until credits reset on the first of the month. You have two options to keep using AI right away: buy credit packs (300 for $15, 500 for $20, or 1,000 for $35 — purchased credits never expire), or enable BYOK to use your own API key at zero credit cost.",
  },
  {
    question: "What is BossBoard?",
    answer:
      "BossBoard is an operations wiki built from the ground up for teams that work alongside AI agents. It combines a document wiki with version history, a team board with threaded discussions, a calendar with Google Calendar sync, daily checklists, and a built-in MCP server plus REST API for agent access.",
  },
  {
    question: "How does AI content generation work?",
    answer:
      "Describe any topic or paste rough notes, and Claude generates a structured document in about 30 seconds — with purpose, scope, numbered procedures, and an extractable checklist. You can edit everything in a rich text editor, and every change is tracked with full version history.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. The Free plan includes 3 team members, 30 AI credits per month (plus 10 bonus on signup), 5 GB storage, wiki version history, and full MCP server + REST API access. No credit card required.",
  },
  {
    question: "How does Google Calendar sync work?",
    answer:
      "Connect your Google account in Settings and your calendar events appear alongside todos and checklists in one unified view. Drag events to reschedule, right-click to add new ones. Changes sync both ways.",
  },
  {
    question: "How does team management work?",
    answer:
      "Invite team members by email, assign wiki pages and onboarding paths, and track read receipts and sign-offs. Use the team board for notices, threaded discussions, and polls. Auto-generate recurring daily/weekly/monthly checklists from any wiki page.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel anytime from your account settings — no questions asked. Your plan remains active until the end of your current billing period, and you won't be charged again.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="bg-background px-4"
      style={{ paddingTop: "96px", paddingBottom: "80px" }}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl text-foreground text-balance"
          style={{ fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          Frequently asked questions
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Everything you need to know about BossBoard.
        </p>

        <div className="mt-10 space-y-0">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border-b">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between py-5 text-left text-foreground"
                >
                  <span className="text-base font-medium pr-4">{faq.question}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                <div
                  className="grid overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="pb-5 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

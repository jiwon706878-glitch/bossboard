"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What's MCP and why do I need it?",
    answer:
      "MCP (Model Context Protocol) is the standard way for AI agents to connect to tools. BossBoard includes a built-in MCP server on every plan, so your Claude, Cursor, or custom agent can read and write wiki pages, post to the board, and manage todos — directly from your terminal or editor. No browser automation, no screenshots, ~50 tokens per action instead of ~5,000.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No install required for the web app — just sign up and go. For agent access, optionally install the CLI via npm install -g bossboard-cli, or point your MCP client (Claude Code, Cursor, etc.) to BossBoard's MCP server endpoint. Both paths work on all plans including Free.",
  },
  {
    question: "What is BossBoard?",
    answer:
      "BossBoard is an AI-powered operations wiki for teams and AI agents. It combines a document wiki with version history, a calendar with Google Calendar sync, a team board with threaded comments and polls, daily checklists, and an agent-friendly REST API with MCP support — all in one place.",
  },
  {
    question: "How does the AI SOP generation work?",
    answer:
      "Describe your topic -- for example, 'morning opening procedure for the cafe' -- and the AI generates a detailed, step-by-step SOP tailored to your industry. It includes purpose, scope, numbered procedures, safety notes, and an extractable checklist. You can edit everything in a rich text editor, and every change is tracked with full version history.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. The free plan includes 20 documents, 3 team members, and 5 AI generations per month. No credit card required to sign up.",
  },
  {
    question: "How does Google Calendar sync work?",
    answer:
      "Connect your Google account in Settings and your calendar events appear alongside todos and checklists in one unified view. Drag events to reschedule, right-click to add new ones. Changes sync both ways.",
  },
  {
    question: "What is the REST API and MCP support?",
    answer:
      "BossBoard provides a full REST API for reading and writing SOPs, logging agent activity, and managing context. MCP (Model Context Protocol) support is included from the $19 Starter plan -- connect Claude, Cursor, or any MCP-compatible AI tool directly to your wiki. Developers and vibe coders use this to automate SOP creation and let AI agents interact with their operations data.",
  },
  {
    question: "How does team management work?",
    answer:
      "Invite team members by email, assign SOPs, and track who has read and signed off on each procedure. Use the team board for notices, discussions, and polls with threaded comments. Build onboarding paths by chaining SOPs together, and auto-generate checklists from any SOP.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel anytime from your account settings -- no questions asked. Your plan will remain active until the end of your billing period, and you won't be charged again.",
  },
  {
    question: "What happens when I run out of credits?",
    answer:
      "You can buy credit packs anytime — 300 for $15, 500 for $20, or 1000 for $35. Purchased credits never expire. Or use your own Anthropic API key (BYOK) for zero credit consumption.",
  },
  {
    question: "Can I use my own AI API key?",
    answer:
      "Yes. Go to Settings → External API Keys and add your Anthropic key. AI features then use your key directly — no BossBoard credits consumed.",
  },
  {
    question: "Is there a per-user fee?",
    answer:
      "No. BossBoard uses flat team pricing. The whole team is included in your plan — no surprises as you grow. Only the Free plan caps team size at 3 members.",
  },
  {
    question: "Can AI agents access BossBoard?",
    answer:
      "Yes — that's a core feature. We provide a REST API, MCP server, and the `bossboard-cli` npm package. Agents can read/write wiki pages, post to the board, manage todos, and run searches with ~50 tokens per action (vs ~5000 for browser automation).",
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
        <h2 className="text-3xl font-bold text-foreground" style={{ letterSpacing: "-0.01em" }}>
          Frequently asked questions
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Everything you need to know about BossBoard.
        </p>

        <div className="mt-10 space-y-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left text-foreground"
              >
                <span className="text-base font-medium">{faq.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 ml-4 text-muted-foreground transition-transform duration-200"
                  style={{ transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {openIndex === i && (
                <div className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

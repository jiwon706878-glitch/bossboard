"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is BossBoard?",
    answer:
      "BossBoard is an AI-powered operations control tower for business owners. It helps you create standard operating procedures, manage your team, track who has read what, and get AI-driven insights into your operations -- all from one place.",
  },
  {
    question: "How does the AI SOP generation work?",
    answer:
      "Describe your topic -- for example, 'morning opening procedure for the cafe' -- and the AI generates a detailed, step-by-step SOP tailored to your industry. It includes purpose, scope, numbered procedures, safety notes, and an extractable checklist. You can edit everything in a rich text editor before publishing.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. The free plan includes 5 SOPs, 3 team members, and 5 AI generations per month. No credit card required to sign up.",
  },
  {
    question: "How does team management work?",
    answer:
      "Invite team members by email, assign SOPs, and track who has read and signed off on each procedure. Build onboarding paths by chaining SOPs together, and auto-generate checklists from any SOP.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel anytime from your account settings -- no questions asked. Your plan will remain active until the end of your billing period, and you won't be charged again.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="px-4"
      style={{
        backgroundColor: "#0C0F17",
        paddingTop: "96px",
        paddingBottom: "80px",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl font-bold"
          style={{
            color: "#E8ECF4",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Frequently asked questions
        </h2>
        <p
          className="mt-2 text-base"
          style={{ color: "#8B95B0" }}
        >
          Everything you need to know about BossBoard.
        </p>

        <div className="mt-10 space-y-0">
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                borderBottom: "1px solid #2A3050",
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left"
                style={{ color: "#E8ECF4" }}
              >
                <span
                  className="text-base font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {faq.question}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 ml-4 transition-transform duration-200"
                  style={{
                    color: "#5A6480",
                    transform:
                      openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {openIndex === i && (
                <div
                  className="pb-5 text-sm leading-relaxed"
                  style={{ color: "#8B95B0" }}
                >
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

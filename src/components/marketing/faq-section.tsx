"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is BossBoard?",
    answer:
      "BossBoard is an AI-powered dashboard built for local business owners. It helps you manage online reviews, generate social media content, and create short-form video scripts — all from one place, in seconds.",
  },
  {
    question: "How does the AI work?",
    answer:
      "BossBoard uses advanced AI models to understand your business type, brand voice, and goals. When you request a review reply, social caption, or video script, the AI generates tailored content that sounds like you — not a robot.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Absolutely! Our free plan includes 30 AI credits per month — enough to respond to reviews, write captions, and test out video scripts. No credit card required to sign up.",
  },
  {
    question: "What platforms does Social AI support?",
    answer:
      "Social AI generates captions optimized for Instagram, Facebook, TikTok, X (Twitter), and LinkedIn. You can choose your platform and tone, and the AI adapts the style accordingly.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel anytime from your account settings — no questions asked. Your plan will remain active until the end of your billing period, and you won't be charged again.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know about BossBoard.
          </p>
        </div>
        <div className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

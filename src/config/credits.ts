export const CREDIT_CONFIG = {
  plans: {
    free:     { monthlyCredits: 30,   signupBonus: 10 },
    starter:  { monthlyCredits: 500,  signupBonus: 0 },
    pro:      { monthlyCredits: 1500, signupBonus: 0 },
    business: { monthlyCredits: 5000, signupBonus: 0 },
  },
  actions: {
    // Light (1 credit)
    tab_ai_question:    { credits: 1, type: "light" as const, label: "AI Question" },
    smart_search_ai:    { credits: 1, type: "light" as const, label: "AI Search" },
    chat:               { credits: 1, type: "light" as const, label: "Chat" },
    text_correction:    { credits: 1, type: "light" as const, label: "Text Fix" },
    // Standard (3 credits)
    sop_generate:       { credits: 3, type: "standard" as const, label: "SOP Generation" },
    checklist_generate: { credits: 3, type: "standard" as const, label: "Checklist Generation" },
    sop_reformat:       { credits: 2, type: "standard" as const, label: "Document Reformat" },
    file_convert:       { credits: 3, type: "standard" as const, label: "File Conversion" },
    // Heavy (5 credits)
    onboarding_generate:{ credits: 5, type: "heavy" as const, label: "Onboarding Templates" },
    monthly_report:     { credits: 5, type: "heavy" as const, label: "Monthly Report" },
    multi_doc_analysis: { credits: 5, type: "heavy" as const, label: "Multi-Doc Analysis" },
  },
  purchasePacks: [
    { id: "300_pack",  credits: 300,  priceUsd: 15, label: "300 Credits" },
    { id: "500_pack",  credits: 500,  priceUsd: 20, label: "500 Credits" },
    { id: "1000_pack", credits: 1000, priceUsd: 35, label: "1,000 Credits" },
  ],
  abuse: {
    maxFailuresPerHour: 5,
    blockDurationMinutes: 60,
  },
} as const;

export type ActionName = keyof typeof CREDIT_CONFIG.actions;

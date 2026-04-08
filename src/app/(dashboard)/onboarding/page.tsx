"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StepAboutYou } from "@/components/onboarding/step-about-you";
import { StepIndustry } from "@/components/onboarding/step-industry";
import { StepGenerateSOPs } from "@/components/onboarding/step-generate-sops";

const sopSuggestions: Record<string, string[]> = {
  "cafe-restaurant": ["Opening Checklist — morning prep, equipment check, register setup", "Closing Checklist — cleaning, cash reconciliation, lockup", "New Barista Training Guide — espresso basics, drink recipes, POS operation"],
  "office-team": ["New Employee Onboarding — first day checklist, tool setup, team intros", "Meeting Room Booking & Etiquette", "IT Equipment Request & Return Process"],
  "factory-workshop": ["Equipment Startup & Shutdown Procedure", "Quality Control Inspection Checklist", "Safety Incident Reporting Protocol"],
  "brewery-distillery": ["CIP Cleaning Procedure — tanks, lines, heat exchanger", "Brew Day Checklist — mashing, boiling, fermentation setup", "Quality Lab Testing Protocol — pH, gravity, ABV checks"],
  "retail-shop": ["Store Opening & Closing Checklist", "Inventory Receiving & Stocking Procedure", "Customer Return & Exchange Policy"],
  "other": ["New Employee Onboarding — first week checklist", "Standard Operating Procedure Template", "Workplace Safety Guidelines"],
};

const TOTAL_STEPS = 3;

function textToTipTapJSON(text: string) {
  const lines = text.split("\n");
  const content: { type: string; content?: { type: string; text: string }[] }[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      content.push({ type: "paragraph" });
      continue;
    }
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    });
  }

  return { type: "doc", content };
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [generatingComplete, setGeneratingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  useEffect(() => {
    async function prefill() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    }
    prefill();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfileAndBusiness() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return false;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
      });

    if (profileError) {
      console.error("Profile save error:", profileError.message);
      toast.error("Failed to save your profile. Please try again.");
      setLoading(false);
      return false;
    }

    const { data, error: bizError } = await supabase
      .from("businesses")
      .insert({
        user_id: user.id,
        name: businessName,
        type: "other",
      })
      .select()
      .single();

    if (bizError) {
      console.error("Business creation error:", bizError.message);
      toast.error("Failed to create your business. Please try again.");
      setLoading(false);
      return false;
    }

    setCurrentBusiness(data);
    setLoading(false);
    return true;
  }

  async function handleUpdateIndustry() {
    setLoading(true);
    if (!currentBusiness) {
      toast.error("No business found");
      setLoading(false);
      return false;
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        type: industry,
        address: address || null,
      })
      .eq("id", currentBusiness.id);

    if (error) {
      console.error("Industry update error:", error.message);
      toast.error("Failed to update your industry. Please try again.");
      setLoading(false);
      return false;
    }

    setCurrentBusiness({ ...currentBusiness, type: industry, address: address || null });
    setLoading(false);
    return true;
  }

  async function handleNext() {
    if (step === 1) {
      if (!fullName.trim() || !businessName.trim()) {
        toast.error("Please fill in your name and company name");
        return;
      }
      const ok = await handleSaveProfileAndBusiness();
      if (ok) setStep(2);
    } else if (step === 2) {
      if (!industry) {
        toast.error("Please select your industry");
        return;
      }
      const ok = await handleUpdateIndustry();
      if (ok) setStep(3);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleGenerateAllSOPs() {
    setIsGenerating(true);
    setGeneratingComplete(false);
    setGenProgress(0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentBusiness) {
      toast.error("Not authenticated");
      setIsGenerating(false);
      return;
    }

    const topics = suggestions;
    let created = 0;

    for (const topic of topics) {
      setGenProgress(created);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: currentBusiness.id, topic }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        if (!data.text?.trim()) continue;

        const text = data.text;
        let title = topic.split(" — ")[0];
        const firstLine = text.split("\n").find((l: string) => l.trim());
        if (firstLine) {
          const cleaned = firstLine.replace(/^\d+\.\s*/, "").replace(/^Title:\s*/i, "").trim();
          if (cleaned && cleaned.length < 80 && !/^title$/i.test(cleaned)) title = cleaned;
        }

        await supabase.from("sops").insert({
          business_id: currentBusiness.id,
          title,
          content: textToTipTapJSON(text),
          summary: text.substring(0, 200).replace(/\n/g, " ").trim(),
          status: "draft",
          version: 1,
          created_by: user.id,
        });
        created++;
      } catch {
        // Continue with next topic
      }
    }

    await createGuideDocuments(user.id, currentBusiness.id);

    setGenProgress(topics.length);
    setGeneratingComplete(true);
    setIsGenerating(false);
    if (created > 0) toast.success(`${created} sample SOPs created!`);
  }

  async function createGuideDocuments(userId: string, businessId: string) {
    const { data: folder } = await supabase
      .from("folders")
      .insert({ business_id: businessId, name: "BossBoard Guide", sort_order: 999, created_by: userId })
      .select("id")
      .single();

    const folderId = folder?.id || null;

    const gettingStarted = `Getting Started with BossBoard

Welcome to BossBoard — your AI-powered operations wiki.

1. Create Your First SOP
Open the Wiki from the sidebar, click "New SOP", and choose one of three methods:
- AI Generate: Describe any task and AI writes a complete procedure in 30 seconds
- Upload & Reformat: Upload a PDF, Word doc, or image — AI converts it to a structured SOP
- Start from Scratch: Write your own document using the rich text editor

2. Organize with Folders
Right-click any folder in the sidebar to create subfolders, rename, or set access permissions. Drag and drop documents between folders to organize your wiki.

3. Invite Your Team
Go to Team & Admin from the sidebar. Send email invites or copy a shareable invite link. Team members can view, read, and sign off on documents.

4. Create Checklists
Open any SOP and click "Create Checklist" to convert it into a daily recurring checklist. Track completion from the Dashboard.

5. Track Everything
The Dashboard shows overdue checklists, pending todos, and team activity at a glance. Every document tracks who has read it.`;

    const tipsShortcuts = `Tips & Shortcuts

Keyboard Shortcuts
- Ctrl+K / Cmd+K: Open smart search from anywhere in the dashboard
- Ctrl+N / Cmd+N: Create a new SOP (from the Wiki page)
- ?: Show all keyboard shortcuts

Smart Search
Press Ctrl+K to open the search bar. Type keywords to search across all document titles and content. Ask a natural language question (like "How often do we clean the tanks?") and click the AI button for an instant answer with source references.

Wiki Links
Type [[ in the editor to link to another document. As you type, a dropdown shows matching documents. Select one to insert a clickable wiki link. In view mode, clicking the link navigates directly to that document.

Copy Protection
In the SOP editor, toggle "Copy Protection" to prevent copying, printing, and right-clicking on sensitive documents. This protection carries over to shared links too.

Sharing Documents
Click "Share" on any document to generate a public link. You can set a password, expiration date, and control whether downloads are allowed. Recipients don't need a BossBoard account.

Document Types
- SOP: Step-by-step procedures and manuals
- Note: General notes, meeting minutes, references
- Policy: Rules, regulations, compliance documents

Stale Document Badges
Documents not updated in 90+ days show an amber "90+ days" badge in the Wiki list as a reminder to review.`;

    const docs = [
      { title: "Getting Started", content: gettingStarted },
      { title: "Tips & Shortcuts", content: tipsShortcuts },
    ];

    for (const doc of docs) {
      await supabase.from("sops").insert({
        business_id: businessId,
        folder_id: folderId,
        title: doc.title,
        content: textToTipTapJSON(doc.content),
        summary: doc.content.substring(0, 200).replace(/\n/g, " ").trim(),
        doc_type: "note",
        tags: ["guide"],
        pinned: true,
        status: "published",
        version: 1,
        created_by: userId,
      });
    }
  }

  function handleGoToDashboard() {
    toast.success("Welcome to BossBoard!");
    router.push("/dashboard");
  }

  const suggestions = sopSuggestions[industry] || sopSuggestions["other"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium text-foreground">
              {step === 1 && "About You"}
              {step === 2 && "Your Industry"}
              {step === 3 && "Create Your First SOP"}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <Card className="w-full border bg-card">
          {step === 1 && (
            <StepAboutYou
              fullName={fullName}
              onFullNameChange={setFullName}
              businessName={businessName}
              onBusinessNameChange={setBusinessName}
            />
          )}

          {step === 2 && (
            <StepIndustry
              industry={industry}
              onIndustryChange={setIndustry}
              address={address}
              onAddressChange={setAddress}
            />
          )}

          {step === 3 && (
            <StepGenerateSOPs
              industry={industry}
              suggestions={suggestions}
              isGenerating={isGenerating}
              generatingComplete={generatingComplete}
              genProgress={genProgress}
              onGenerateAll={handleGenerateAllSOPs}
              onGoToDashboard={handleGoToDashboard}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            {step > 1 && step < 3 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading} className="transition-colors duration-150">
                {loading ? "Saving..." : "Next"}
              </Button>
            ) : (
              !generatingComplete && !isGenerating && (
                <button
                  onClick={handleGoToDashboard}
                  className="text-sm text-muted-foreground underline hover:text-foreground transition-colors duration-150"
                >
                  Skip for now
                </button>
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

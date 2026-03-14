"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

const industries = [
  { value: "cafe-restaurant", label: "Cafe / Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "saas-tech", label: "SaaS / Tech" },
  { value: "agency", label: "Agency" },
  { value: "healthcare", label: "Healthcare" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "other", label: "Other" },
];

const sopSuggestions: Record<string, string[]> = {
  "cafe-restaurant": ["Morning opening procedures", "Food safety & hygiene protocol", "Customer complaint handling"],
  "retail": ["Store opening & closing checklist", "Inventory receiving procedure", "Return & exchange policy"],
  "saas-tech": ["New employee onboarding", "Incident response procedure", "Code deployment process"],
  "agency": ["Client onboarding process", "Project handoff procedure", "Quality assurance checklist"],
  "healthcare": ["Patient intake procedure", "Medication administration protocol", "Emergency response plan"],
  "manufacturing": ["Equipment startup procedure", "Quality control inspection", "Safety incident reporting"],
  "other": ["New employee onboarding", "Standard operating procedure template", "Workplace safety guidelines"],
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
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatingComplete, setGeneratingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const { complete, isLoading: isGenerating } = useCompletion({
    api: "/api/ai/generate",
    body: {
      businessId: currentBusiness?.id,
      topic: selectedTopic,
    },
    onFinish: async (_prompt, completion) => {
      // Save generated SOP to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentBusiness) {
        toast.error("Could not save SOP");
        setGeneratingComplete(true);
        return;
      }

      // Extract title from first line
      let title = selectedTopic;
      const firstLine = completion.split("\n").find((l) => l.trim());
      if (firstLine) {
        const cleaned = firstLine
          .replace(/^\d+\.\s*/, "")
          .replace(/^Title:\s*/i, "")
          .trim();
        title = cleaned.length > 80 ? cleaned.substring(0, 80) : cleaned;
      }

      const summary = completion.substring(0, 200).replace(/\n/g, " ").trim();
      const content = textToTipTapJSON(completion);

      const { error } = await supabase
        .from("sops")
        .insert({
          business_id: currentBusiness.id,
          title: title,
          content: content,
          summary: summary || null,
          status: "draft",
          version: 1,
          created_by: user.id,
        });

      if (error) {
        toast.error("SOP generated but failed to save: " + error.message);
      } else {
        toast.success("Your first SOP has been created!");
      }

      setGeneratingComplete(true);
    },
  });

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

    // Save profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
      });

    if (profileError) {
      toast.error(profileError.message);
      setLoading(false);
      return false;
    }

    // Create business
    const { data, error: bizError } = await supabase
      .from("businesses")
      .insert({
        user_id: user.id,
        name: businessName,
      })
      .select()
      .single();

    if (bizError) {
      toast.error(bizError.message);
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
      toast.error(error.message);
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

  async function handleGenerateSOP() {
    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }
    setGeneratingComplete(false);
    await complete("");
  }

  function handleGoToDashboard() {
    toast.success("Welcome to BossBoard!");
    router.push("/dashboard");
    router.refresh();
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
          {/* Step 1: About You */}
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">About You</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Let us know who you are so we can personalize your experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full name</Label>
                  <Input
                    id="fullName"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-foreground">Company name</Label>
                  <Input
                    id="businessName"
                    placeholder="Acme Coffee Shop"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-background border"
                    required
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Your Industry */}
          {step === 2 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">Your Industry</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Tell us about your industry so we can tailor the AI to your needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-foreground">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground">Address (optional)</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-background border"
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Create Your First SOP */}
          {step === 3 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">Create Your First SOP</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Pick a topic below and we'll generate a ready-to-use SOP for your business.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isGenerating && !generatingComplete && (
                  <>
                    <div className="space-y-3">
                      {suggestions.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          className={cn(
                            "w-full rounded-md border p-4 text-left text-sm font-medium transition-colors duration-150",
                            selectedTopic === topic
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleGenerateSOP}
                      disabled={!selectedTopic}
                      className="w-full transition-colors duration-150"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate SOP
                    </Button>
                  </>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Creating your first SOP...</p>
                  </div>
                )}

                {generatingComplete && !isGenerating && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Your SOP is ready!</p>
                    <Button onClick={handleGoToDashboard} className="w-full transition-colors duration-150">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
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

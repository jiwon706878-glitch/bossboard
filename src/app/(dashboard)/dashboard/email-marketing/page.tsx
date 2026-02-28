"use client";

import { useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";

function parseEmail(text: string) {
  const sections: Record<string, string> = {};
  const markers = ["---SUBJECT LINE---", "---PREVIEW TEXT---", "---EMAIL BODY---"];

  let current = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (markers.includes(trimmed)) {
      current = trimmed.replace(/---/g, "").trim().toLowerCase();
      continue;
    }
    if (current) {
      sections[current] = (sections[current] || "") + line + "\n";
    }
  }

  return {
    subjectLine: sections["subject line"]?.trim() || "",
    previewText: sections["preview text"]?.trim() || "",
    emailBody: sections["email body"]?.trim() || "",
  };
}

export default function EmailMarketingPage() {
  const [promoDetails, setPromoDetails] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [parsedEmail, setParsedEmail] = useState<{
    subjectLine: string;
    previewText: string;
    emailBody: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState("");

  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const { complete, isLoading } = useCompletion({
    api: "/api/ai/email-marketing",
    body: {
      businessId: currentBusiness?.id,
      promoDetails,
      audience,
      tone,
    },
    onFinish: (_prompt, completion) => {
      setParsedEmail(parseEmail(completion));
    },
  });

  async function handleGenerate() {
    if (!currentBusiness) {
      toast.error("No business selected");
      return;
    }
    if (!promoDetails) {
      toast.error("Please describe your promotion or topic");
      return;
    }
    await complete("");
  }

  async function copyText(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(""), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Marketing AI</h1>
        <p className="text-muted-foreground">
          Generate compelling marketing emails for your business in seconds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What is this email about?</Label>
            <Textarea
              value={promoDetails}
              onChange={(e) => setPromoDetails(e.target.value)}
              placeholder="e.g., 20% off all services this weekend, new menu launch, holiday hours update, customer appreciation event..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., Existing customers, new leads..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading || !promoDetails}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Email (1 credit)
          </Button>
        </CardContent>
      </Card>

      {parsedEmail && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedEmail.subjectLine && (
              <div className="rounded-lg border-l-4 border-primary bg-primary/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    Subject Line
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyText(parsedEmail.subjectLine, "subject")}
                  >
                    {copiedField === "subject" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm font-medium">{parsedEmail.subjectLine}</p>
              </div>
            )}

            {parsedEmail.previewText && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview Text
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyText(parsedEmail.previewText, "preview")}
                  >
                    {copiedField === "preview" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm">{parsedEmail.previewText}</p>
              </div>
            )}

            {parsedEmail.emailBody && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email Body
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyText(parsedEmail.emailBody, "body")}
                  >
                    {copiedField === "body" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{parsedEmail.emailBody}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const full = `Subject: ${parsedEmail.subjectLine}\n\n${parsedEmail.emailBody}`;
                copyText(full, "all");
              }}
            >
              {copiedField === "all" ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy Full Email
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

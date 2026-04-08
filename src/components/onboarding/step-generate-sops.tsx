"use client";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { industries } from "./step-industry";

interface StepGenerateSOPsProps {
  industry: string;
  suggestions: string[];
  isGenerating: boolean;
  generatingComplete: boolean;
  genProgress: number;
  onGenerateAll: () => void;
  onGoToDashboard: () => void;
}

export function StepGenerateSOPs({
  industry,
  suggestions,
  isGenerating,
  generatingComplete,
  genProgress,
  onGenerateAll,
  onGoToDashboard,
}: StepGenerateSOPsProps) {
  return (
    <>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">
          {generatingComplete ? "Your wiki is ready!" : "Let AI create sample SOPs"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {generatingComplete
            ? "We've created sample SOPs and a Getting Started guide in your wiki."
            : `Based on your ${industries.find((i) => i.value === industry)?.label || "business"} type, we'll generate ${suggestions.length} sample SOPs for you.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isGenerating && !generatingComplete && (
          <>
            <div className="space-y-2">
              {suggestions.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-foreground">{topic.split(" — ")[0]}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={onGenerateAll}
              className="w-full transition-colors duration-150"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {suggestions.length} Sample SOPs
            </Button>
          </>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Creating SOP {genProgress + 1} of {suggestions.length}...
            </p>
            <div className="w-full h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${((genProgress + 0.5) / suggestions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {generatingComplete && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Your wiki is set up</p>
              <p className="text-xs text-muted-foreground">
                Check the sidebar: Wiki has your SOPs, &quot;BossBoard Guide&quot; folder has tips.
              </p>
            </div>
            <Button onClick={onGoToDashboard} className="w-full transition-colors duration-150">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
}

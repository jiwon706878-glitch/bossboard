"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StepAboutYouProps {
  fullName: string;
  onFullNameChange: (value: string) => void;
  businessName: string;
  onBusinessNameChange: (value: string) => void;
}

export function StepAboutYou({
  fullName,
  onFullNameChange,
  businessName,
  onBusinessNameChange,
}: StepAboutYouProps) {
  return (
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
            onChange={(e) => onFullNameChange(e.target.value)}
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
            onChange={(e) => onBusinessNameChange(e.target.value)}
            className="bg-background border"
            required
          />
        </div>
      </CardContent>
    </>
  );
}

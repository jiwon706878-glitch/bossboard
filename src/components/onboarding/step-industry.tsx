"use client";

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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const industries = [
  { value: "cafe-restaurant", label: "Cafe / Restaurant" },
  { value: "office-team", label: "Office / Team" },
  { value: "factory-workshop", label: "Factory / Workshop" },
  { value: "brewery-distillery", label: "Brewery / Distillery" },
  { value: "retail-shop", label: "Retail / Shop" },
  { value: "other", label: "Other" },
];

interface StepIndustryProps {
  industry: string;
  onIndustryChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
}

export function StepIndustry({
  industry,
  onIndustryChange,
  address,
  onAddressChange,
}: StepIndustryProps) {
  return (
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
          <Select value={industry} onValueChange={onIndustryChange}>
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
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-background border"
          />
        </div>
      </CardContent>
    </>
  );
}

export { industries };

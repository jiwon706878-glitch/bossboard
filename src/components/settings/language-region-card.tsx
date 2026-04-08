"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ko", label: "\ud55c\uad6d\uc5b4" },
  { value: "ja", label: "\u65e5\u672c\u8a9e" },
  { value: "es", label: "Espa\u00f1ol" },
  { value: "fr", label: "Fran\u00e7ais" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "\u4e2d\u6587" },
  { value: "pt", label: "Portugu\u00eas" },
] as const;

interface TimezoneEntry { value: string; label: string; region: string; }

function getGroupedTimezones(): Record<string, TimezoneEntry[]> {
  const zones: TimezoneEntry[] = Intl.supportedValuesOf("timeZone").map((tz) => {
    const parts = tz.split("/");
    return { value: tz, label: parts.slice(1).join("/").replace(/_/g, " ") || tz, region: parts[0] };
  });
  const grouped: Record<string, TimezoneEntry[]> = {};
  for (const z of zones) { if (!grouped[z.region]) grouped[z.region] = []; grouped[z.region].push(z); }
  return grouped;
}

interface LanguageRegionCardProps {
  displayLanguage: string;
  displayTimezone: string;
  onLanguageChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  disabled: boolean;
}

export function LanguageRegionCard({
  displayLanguage,
  displayTimezone,
  onLanguageChange,
  onTimezoneChange,
  onSave,
  saving,
  disabled,
}: LanguageRegionCardProps) {
  const [tzSearch, setTzSearch] = useState("");

  const groupedTimezones = useMemo(() => getGroupedTimezones(), []);
  const filteredTimezones = useMemo(() => {
    if (!tzSearch.trim()) return groupedTimezones;
    const q = tzSearch.toLowerCase();
    const result: Record<string, TimezoneEntry[]> = {};
    for (const [region, tzs] of Object.entries(groupedTimezones)) {
      const filtered = tzs.filter((tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q) || region.toLowerCase().includes(q));
      if (filtered.length > 0) result[region] = filtered;
    }
    return result;
  }, [groupedTimezones, tzSearch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language & Region</CardTitle>
        <CardDescription>Set your default language and timezone for your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Default Language</Label>
            <Select value={displayLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={displayTimezone} onValueChange={onTimezoneChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select timezone..." /></SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <Input placeholder="Search timezones..." value={tzSearch} onChange={(e) => setTzSearch(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.stopPropagation()} />
                </div>
                {Object.entries(filteredTimezones).map(([region, tzs]) => (
                  <SelectGroup key={region}>
                    <SelectLabel>{region}</SelectLabel>
                    {tzs.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                {Object.keys(filteredTimezones).length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No timezones found</p>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving || disabled}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

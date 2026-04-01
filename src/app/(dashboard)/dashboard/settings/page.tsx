"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { fetchCurrentUser, fetchProfile, fetchBusinessSettings, userKeys, settingsKeys } from "@/lib/queries";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { ApiKeysSection } from "@/components/settings/api-keys-section";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "中文" },
  { value: "pt", label: "Português" },
] as const;

interface TimezoneEntry {
  value: string;
  label: string;
  region: string;
}

function getGroupedTimezones(): Record<string, TimezoneEntry[]> {
  const zones: TimezoneEntry[] = Intl.supportedValuesOf("timeZone").map((tz) => {
    const parts = tz.split("/");
    const region = parts[0];
    const city = parts.slice(1).join("/").replace(/_/g, " ");
    return { value: tz, label: city || tz, region };
  });
  const grouped: Record<string, TimezoneEntry[]> = {};
  for (const z of zones) {
    if (!grouped[z.region]) grouped[z.region] = [];
    grouped[z.region].push(z);
  }
  return grouped;
}

interface NotificationSettings {
  journal_feedback?: boolean;
  checklist_assignments?: boolean;
  board_posts?: boolean;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const businessId = currentBusiness?.id;

  // Queries with high staleTime — served from cache on revisit
  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bizSettings, isLoading: bizLoading, isFetching: bizFetching } = useQuery({
    queryKey: settingsKeys.business(businessId ?? ""),
    queryFn: () => fetchBusinessSettings(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const planId = (profile?.plan_id || "free") as PlanId;
  const plan = plans[planId];
  const isProOrAbove = planId === "pro" || planId === "business";
  const detectedTz = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  // Form inputs: null = "show from cache", non-null = "user has edited"
  const [fullNameInput, setFullNameInput] = useState<string | null>(null);
  const [businessNameInput, setBusinessNameInput] = useState<string | null>(null);
  const [languageInput, setLanguageInput] = useState<string | null>(null);
  const [timezoneInput, setTimezoneInput] = useState<string | null>(null);
  const [tzSearch, setTzSearch] = useState("");
  const [notificationsInput, setNotificationsInput] = useState<NotificationSettings | null>(null);
  const [developerMode, setDeveloperMode] = useState<boolean | null>(null);

  // Derived display values: local edit > cache > default
  const displayFullName = fullNameInput ?? profile?.full_name ?? "";
  const displayBusinessName = businessNameInput ?? currentBusiness?.name ?? "";
  const displayLanguage = languageInput ?? bizSettings?.language ?? "en";
  const displayTimezone = timezoneInput ?? bizSettings?.timezone ?? detectedTz;
  const displayNotifications = notificationsInput ?? profile?.notification_settings ?? {};
  const displayDevMode = developerMode ?? profile?.developer_mode ?? false;

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingLangRegion, setSavingLangRegion] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingDevMode, setSavingDevMode] = useState(false);

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

  // ─── Save handlers with validation ──────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const nameToSave = fullNameInput ?? profile?.full_name;
    if (!nameToSave?.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: nameToSave.trim() }).eq("id", userId);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Profile updated");
      setFullNameInput(null);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, full_name: nameToSave.trim() }));
    }
    setSavingProfile(false);
  }

  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    const nameToSave = businessNameInput ?? currentBusiness.name;
    if (!String(nameToSave).trim()) { toast.error("Business name cannot be empty"); return; }
    setSavingBusiness(true);
    const { data, error } = await supabase
      .from("businesses")
      .update({ name: String(nameToSave).trim() })
      .eq("id", currentBusiness.id)
      .select()
      .single();
    if (error) { toast.error(error.message); }
    else {
      toast.success("Business updated");
      setBusinessNameInput(null);
      if (data) setCurrentBusiness(data);
      router.refresh();
    }
    setSavingBusiness(false);
  }

  async function handleSaveLangRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    setSavingLangRegion(true);
    const { error } = await supabase
      .from("businesses")
      .update({ language: displayLanguage, timezone: displayTimezone })
      .eq("id", currentBusiness.id);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Language & region saved");
      setLanguageInput(null);
      setTimezoneInput(null);
      queryClient.setQueryData(settingsKeys.business(currentBusiness.id), (old: any) => ({ ...old, language: displayLanguage, timezone: displayTimezone }));
    }
    setSavingLangRegion(false);
  }

  async function handleSaveNotifications() {
    if (!userId) return;
    setSavingNotifications(true);
    const toSave = displayNotifications;
    const { error } = await supabase.from("profiles").update({ notification_settings: toSave }).eq("id", userId);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Notification preferences saved");
      setNotificationsInput(null);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, notification_settings: toSave }));
    }
    setSavingNotifications(false);
  }

  async function handleToggleDevMode(enabled: boolean) {
    if (!userId) return;
    setDeveloperMode(enabled);
    setSavingDevMode(true);
    const { error } = await supabase.from("profiles").update({ developer_mode: enabled }).eq("id", userId);
    if (error) { toast.error(error.message); setDeveloperMode(!enabled); }
    else {
      toast.success(enabled ? "Developer mode enabled" : "Developer mode disabled");
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, developer_mode: enabled }));
    }
    setSavingDevMode(false);
  }

  function updateNotification(key: keyof NotificationSettings, value: boolean) {
    setNotificationsInput((prev) => ({ ...(prev ?? displayNotifications), [key]: value }));
  }

  // ─── Full-page skeleton until data is loaded ────

  if (!user || profileLoading || (businessId && bizLoading)) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and business settings.</p>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and business settings.</p>
      </div>

      {/* Card 1: Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={displayFullName} onChange={(e) => setFullNameInput(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingProfile || profileFetching}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 2: Business */}
      <Card>
        <CardHeader><CardTitle>Business</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={displayBusinessName} onChange={(e) => setBusinessNameInput(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingBusiness || !currentBusiness}>
              {savingBusiness ? "Saving..." : "Save Business"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 3: Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle>Language & Region</CardTitle>
          <CardDescription>Set your default language and timezone for your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLangRegion} className="space-y-4">
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select value={displayLanguage} onValueChange={setLanguageInput}>
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
              <Select value={displayTimezone} onValueChange={setTimezoneInput}>
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
            <Button type="submit" disabled={savingLangRegion || !currentBusiness || bizFetching}>
              {savingLangRegion ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 4: Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose which email notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isProOrAbove ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed px-4 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">Upgrade to Pro to enable email notifications.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Journal feedback</Label>
                  <p className="text-xs text-muted-foreground">When a manager leaves feedback on your journal entry</p>
                </div>
                <Switch checked={displayNotifications.journal_feedback ?? false} onCheckedChange={(v) => updateNotification("journal_feedback", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Checklist assignments</Label>
                  <p className="text-xs text-muted-foreground">When a checklist is assigned to you</p>
                </div>
                <Switch checked={displayNotifications.checklist_assignments ?? false} onCheckedChange={(v) => updateNotification("checklist_assignments", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Board posts</Label>
                  <p className="text-xs text-muted-foreground">When a new post is published to your team board</p>
                </div>
                <Switch checked={displayNotifications.board_posts ?? false} onCheckedChange={(v) => updateNotification("board_posts", v)} />
              </div>
              <Button type="button" onClick={handleSaveNotifications} disabled={savingNotifications || profileFetching}>
                {savingNotifications ? "Saving..." : "Save Notifications"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 5: Developer Mode */}
      <Card>
        <CardHeader><CardTitle>Developer Mode</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Enable Developer Mode</Label>
              <p className="text-sm text-muted-foreground">Show API keys, MCP connection guide, and Agent Activity in your sidebar.</p>
            </div>
            <Switch checked={displayDevMode} onCheckedChange={handleToggleDevMode} disabled={savingDevMode} />
          </div>
        </CardContent>
      </Card>

      {/* Card 6: API Keys (conditional) */}
      {displayDevMode && <ApiKeysSection />}
    </div>
  );
}

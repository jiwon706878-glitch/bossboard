"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ProfileCard } from "@/components/settings/profile-card";
import { BusinessCard } from "@/components/settings/business-card";

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

interface NotificationSettings {
  [key: string]: boolean | undefined;
}

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

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

  // Language/Region local state
  const [languageInput, setLanguageInput] = useState<string | null>(null);
  const [timezoneInput, setTimezoneInput] = useState<string | null>(null);
  const [tzSearch, setTzSearch] = useState("");
  const [savingLangRegion, setSavingLangRegion] = useState(false);

  // Notifications local state
  const [notificationsInput, setNotificationsInput] = useState<NotificationSettings | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Developer mode local state
  const [developerMode, setDeveloperMode] = useState<boolean | null>(null);
  const [savingDevMode, setSavingDevMode] = useState(false);

  // Sticky note (localStorage only)
  const [stickyHidden, setStickyHidden] = useState(false);
  useEffect(() => {
    setStickyHidden(localStorage.getItem("bossboard-sticky-hidden") === "true");
  }, []);

  const displayLanguage = languageInput ?? bizSettings?.language ?? "en";
  const displayTimezone = timezoneInput ?? bizSettings?.timezone ?? detectedTz;
  const displayNotifications = notificationsInput ?? profile?.notification_settings ?? {};
  const displayDevMode = developerMode ?? profile?.developer_mode ?? false;

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

  function updateNotification(key: string, value: boolean) {
    setNotificationsInput((prev) => ({ ...(prev ?? displayNotifications), [key]: value }));
  }

  // Full-page skeleton until data is loaded
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and business settings.</p>
      </div>

      {/* Card 1: Profile — isolated component */}
      <ProfileCard userId={userId!} initialName={profile?.full_name ?? ""} isFetching={profileFetching} />

      {/* Card 2: Business — isolated component */}
      <BusinessCard userId={userId!} initialName={String(currentBusiness?.name ?? "")} />

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
          <CardDescription>Choose which notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isProOrAbove ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed px-4 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">Upgrade to Pro to enable notifications.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <NotifSection title="Operations" rows={[
                { label: "Checklist assigned to me", app: "checklist_assigned_app", email: "checklist_assigned_email" },
                { label: "Checklist due tomorrow", app: "checklist_due_soon_app", email: "checklist_due_soon_email" },
                { label: "Checklist overdue", app: "checklist_overdue_app", email: "checklist_overdue_email" },
                { label: "Checklist completed (admin)", app: "checklist_completed_app", email: "checklist_completed_email" },
                { label: "Todo due tomorrow", app: "todo_due_soon_app", email: "todo_due_soon_email" },
              ]} notifications={displayNotifications} onToggle={updateNotification} />

              <NotifSection title="Documents" rows={[
                { label: "New document published", app: "new_document_app", email: "new_document_email" },
                { label: "Document assigned to me", app: "document_assigned_app", email: "document_assigned_email" },
              ]} notifications={displayNotifications} onToggle={updateNotification} />

              <NotifSection title="Team & Communication" rows={[
                { label: "New board post", app: "board_post_app", email: "board_post_email" },
                { label: "Journal feedback received", app: "journal_feedback_app", email: "journal_feedback_email" },
                { label: "Journal not submitted (admin)", app: "journal_missing_app", email: "journal_missing_email" },
                { label: "New team member joined", app: "new_team_member_app", email: "new_team_member_email" },
              ]} notifications={displayNotifications} onToggle={updateNotification} />

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

      {/* Card 6: Sticky Note */}
      <Card>
        <CardHeader><CardTitle>Sticky Note</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">Show sticky note</Label>
              <p className="text-sm text-muted-foreground">Display the quick notes widget on the dashboard.</p>
            </div>
            <Switch
              checked={!stickyHidden}
              onCheckedChange={(v) => {
                const hidden = !v;
                localStorage.setItem("bossboard-sticky-hidden", hidden ? "true" : "false");
                setStickyHidden(hidden);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 7: API Keys (conditional) */}
      {displayDevMode && <ApiKeysSection />}
    </div>
  );
}

function NotifSection({ title, rows, notifications, onToggle }: {
  title: string;
  rows: Array<{ label: string; app: string; email: string }>;
  notifications: NotificationSettings;
  onToggle: (key: string, value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="rounded-md border">
        <div className="flex items-center border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="flex-1">Event</span>
          <span className="w-16 text-center">In-app</span>
          <span className="w-16 text-center">Email</span>
        </div>
        {rows.map((row) => (
          <div key={row.app} className="flex items-center px-4 py-2.5 border-b last:border-0 hover:bg-muted/30">
            <span className="flex-1 text-sm">{row.label}</span>
            <div className="w-16 flex justify-center">
              <Switch checked={notifications[row.app] ?? false} onCheckedChange={(v) => onToggle(row.app, v)} />
            </div>
            <div className="w-16 flex justify-center">
              <Switch checked={notifications[row.email] ?? false} onCheckedChange={(v) => onToggle(row.email, v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

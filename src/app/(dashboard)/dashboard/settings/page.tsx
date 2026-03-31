"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    return {
      value: tz,
      label: city || tz,
      region,
    };
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

function FieldSkeleton() {
  return <div className="h-10 animate-pulse rounded-md bg-muted" />;
}

export default function SettingsPage() {
  // Profile state
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Language & Region
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("");
  const [tzSearch, setTzSearch] = useState("");

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>({});

  // Developer mode
  const [developerMode, setDeveloperMode] = useState(false);

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingLangRegion, setSavingLangRegion] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingDevMode, setSavingDevMode] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const businessId = currentBusiness?.id;

  const planId = (currentBusiness?.plan || "free") as PlanId;
  const plan = plans[planId];
  const isProOrAbove = planId === "pro" || planId === "business";

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

  // Queries — shared cache with sidebar/dashboard
  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const { data: bizSettings, isLoading: bizLoading } = useQuery({
    queryKey: settingsKeys.business(businessId ?? ""),
    queryFn: () => fetchBusinessSettings(businessId!),
    enabled: !!businessId,
  });

  const dataLoaded = !profileLoading && (!businessId || !bizLoading);

  // Sync query data to form state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setNotifications(profile.notification_settings || {});
      setDeveloperMode(profile.developer_mode || false);
    }
  }, [profile]);

  useEffect(() => {
    if (currentBusiness) setBusinessName(currentBusiness.name);
  }, [currentBusiness]);

  useEffect(() => {
    if (bizSettings) {
      setLanguage(bizSettings.language || "en");
      setTimezone(bizSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    } else if (!businessId) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [bizSettings, businessId]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);

    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) }); }
    setSavingProfile(false);
  }

  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    setSavingBusiness(true);

    const { data, error } = await supabase
      .from("businesses")
      .update({ name: businessName })
      .eq("id", currentBusiness.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Business updated");
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
      .update({ language, timezone })
      .eq("id", currentBusiness.id);

    if (error) toast.error(error.message);
    else toast.success("Language & region saved");
    setSavingLangRegion(false);
  }

  async function handleSaveNotifications() {
    if (!userId) return;
    setSavingNotifications(true);
    const { error } = await supabase.from("profiles").update({ notification_settings: notifications }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success("Notification preferences saved"); queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) }); }
    setSavingNotifications(false);
  }

  async function handleToggleDevMode(enabled: boolean) {
    if (!userId) return;
    setDeveloperMode(enabled);
    setSavingDevMode(true);
    const { error } = await supabase.from("profiles").update({ developer_mode: enabled }).eq("id", userId);
    if (error) { toast.error(error.message); setDeveloperMode(!enabled); }
    else { toast.success(enabled ? "Developer mode enabled" : "Developer mode disabled"); queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) }); }
    setSavingDevMode(false);
  }

  function updateNotification(key: keyof NotificationSettings, value: boolean) {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and business settings.
        </p>
      </div>

      {/* Card 1: Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              {!dataLoaded ? <FieldSkeleton /> : (
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}
            </div>
            <Button type="submit" disabled={savingProfile || !dataLoaded}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 2: Business */}
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              {!dataLoaded ? <FieldSkeleton /> : (
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              )}
            </div>
            <Button type="submit" disabled={savingBusiness || !currentBusiness || !dataLoaded}>
              {savingBusiness ? "Saving..." : "Save Business"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 3: Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle>Language & Region</CardTitle>
          <CardDescription>
            Set your default language and timezone for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLangRegion} className="space-y-4">
            <div className="space-y-2">
              <Label>Default Language</Label>
              {!dataLoaded ? <FieldSkeleton /> : (
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              {!dataLoaded ? <FieldSkeleton /> : (
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Search timezones..."
                        value={tzSearch}
                        onChange={(e) => setTzSearch(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {Object.entries(filteredTimezones).map(([region, tzs]) => (
                      <SelectGroup key={region}>
                        <SelectLabel>{region}</SelectLabel>
                        {tzs.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {Object.keys(filteredTimezones).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No timezones found
                      </p>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button type="submit" disabled={savingLangRegion || !currentBusiness || !dataLoaded}>
              {savingLangRegion ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 4: Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose which email notifications you receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isProOrAbove ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed px-4 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro to enable email notifications.
              </p>
            </div>
          ) : !dataLoaded ? (
            <div className="space-y-4">
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Journal feedback</Label>
                  <p className="text-xs text-muted-foreground">
                    When a manager leaves feedback on your journal entry
                  </p>
                </div>
                <Switch
                  checked={notifications.journal_feedback ?? false}
                  onCheckedChange={(v) => updateNotification("journal_feedback", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Checklist assignments</Label>
                  <p className="text-xs text-muted-foreground">
                    When a checklist is assigned to you
                  </p>
                </div>
                <Switch
                  checked={notifications.checklist_assignments ?? false}
                  onCheckedChange={(v) => updateNotification("checklist_assignments", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Board posts</Label>
                  <p className="text-xs text-muted-foreground">
                    When a new post is published to your team board
                  </p>
                </div>
                <Switch
                  checked={notifications.board_posts ?? false}
                  onCheckedChange={(v) => updateNotification("board_posts", v)}
                />
              </div>
              <Button
                type="button"
                onClick={handleSaveNotifications}
                disabled={savingNotifications}
              >
                {savingNotifications ? "Saving..." : "Save Notifications"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 5: Developer Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Developer Mode</CardTitle>
        </CardHeader>
        <CardContent>
          {!dataLoaded ? (
            <FieldSkeleton />
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Enable Developer Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show API keys, MCP connection guide, and Agent Activity in your sidebar.
                </p>
              </div>
              <Switch
                checked={developerMode}
                onCheckedChange={handleToggleDevMode}
                disabled={savingDevMode}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 6: API Keys (conditional) */}
      {developerMode && <ApiKeysSection />}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { plans, type PlanId } from "@/config/plans";
import { fetchCurrentUser, fetchProfile, fetchBusinessSettings, userKeys, settingsKeys } from "@/lib/queries";
import { toast } from "sonner";
import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { ExternalApiKeysSection } from "@/components/settings/external-api-keys-section";
import { ProfileCard } from "@/components/settings/profile-card";
import { EmailChangeCard } from "@/components/settings/email-change-card";
import { BusinessCard } from "@/components/settings/business-card";
import { LanguageRegionCard } from "@/components/settings/language-region-card";
import { NotificationsCard } from "@/components/settings/notifications-card";
import { StickyNoteCard } from "@/components/settings/sticky-note-card";
import { GoogleCalendarCard } from "@/components/settings/google-calendar-card";
import { ThemeCard } from "@/components/settings/theme-card";
import { DeveloperModeCard } from "@/components/settings/developer-mode-card";

interface NotificationSettings {
  [key: string]: boolean | undefined;
}

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const { isAdmin, loadRole, loaded: roleLoaded } = useRoleStore();

  useEffect(() => { loadRole(); }, [loadRole]);

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
  const [savingLangRegion, setSavingLangRegion] = useState(false);

  // Notifications local state
  const [notificationsInput, setNotificationsInput] = useState<NotificationSettings | null>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Developer mode local state
  const [developerMode, setDeveloperMode] = useState<boolean | null>(null);
  const [savingDevMode, setSavingDevMode] = useState(false);

  // Google Calendar
  const googleAuthUrl = getGoogleAuthUrl();

  async function handleDisconnectGoogle() {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ google_calendar_tokens: null }).eq("id", userId);
    if (error) {
      toast.error("Failed to disconnect Google Calendar.");
    } else {
      toast.success("Google Calendar disconnected");
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, google_calendar_tokens: null }));
    }
  }

  const displayLanguage = languageInput ?? bizSettings?.language ?? "en";
  const displayTimezone = timezoneInput ?? bizSettings?.timezone ?? detectedTz;
  const displayNotifications = notificationsInput ?? profile?.notification_settings ?? {};
  const displayDevMode = developerMode ?? profile?.developer_mode ?? false;

  async function handleSaveLangRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    setSavingLangRegion(true);
    const { error } = await supabase
      .from("businesses")
      .update({ language: displayLanguage, timezone: displayTimezone })
      .eq("id", currentBusiness.id);
    if (error) { console.error("Language save error:", error.message); toast.error("Failed to save language settings. Please try again."); }
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
    if (error) { console.error("Notification save error:", error.message); toast.error("Failed to save notification preferences. Please try again."); }
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
    if (error) { console.error("Dev mode toggle error:", error.message); toast.error("Failed to update developer mode. Please try again."); setDeveloperMode(!enabled); }
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
    <div className="mx-auto max-w-2xl space-y-6 stagger-children">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and business settings.</p>
      </div>

      {/* Card 1: Profile */}
      <div className="animate-stagger-in" style={{ animationDelay: "0ms" }}>
        <ProfileCard userId={userId!} initialName={profile?.full_name ?? ""} initialAvatarUrl={profile?.avatar_url} isFetching={profileFetching} />
      </div>

      {/* Card 2: Email Change */}
      <div className="animate-stagger-in" style={{ animationDelay: "60ms" }}>
        <EmailChangeCard />
      </div>

      {/* Card 3: Business — admin only */}
      {(!roleLoaded || isAdmin()) && <div className="animate-stagger-in" style={{ animationDelay: "120ms" }}><BusinessCard userId={userId!} initialName={currentBusiness?.name ?? ""} /></div>}

      {/* Card 4: Language & Region — admin only */}
      {(!roleLoaded || isAdmin()) && (
        <div className="animate-stagger-in" style={{ animationDelay: "180ms" }}>
          <LanguageRegionCard
            displayLanguage={displayLanguage}
            displayTimezone={displayTimezone}
            onLanguageChange={setLanguageInput}
            onTimezoneChange={setTimezoneInput}
            onSave={handleSaveLangRegion}
            saving={savingLangRegion}
            disabled={!currentBusiness || bizFetching}
          />
        </div>
      )}

      {/* Card 5: Notifications — admin only */}
      {(!roleLoaded || isAdmin()) && (
        <div className="animate-stagger-in" style={{ animationDelay: "240ms" }}>
          <NotificationsCard
            isProOrAbove={isProOrAbove}
            notifications={displayNotifications}
            onToggle={updateNotification}
            onSave={handleSaveNotifications}
            saving={savingNotifications}
            disabled={profileFetching}
          />
        </div>
      )}

      {/* Card 5: Sticky Note */}
      <div className="animate-stagger-in" style={{ animationDelay: "300ms" }}>
        <StickyNoteCard />
      </div>

      {/* Card 5b: Google Calendar — admin only */}
      {(!roleLoaded || isAdmin()) && (
        <div className="animate-stagger-in" style={{ animationDelay: "330ms" }}>
          <GoogleCalendarCard
            isConnected={!!profile?.google_calendar_tokens}
            googleAuthUrl={googleAuthUrl}
            onDisconnect={handleDisconnectGoogle}
          />
        </div>
      )}

      {/* Card 6: Theme Color */}
      <div className="animate-stagger-in" style={{ animationDelay: "390ms" }}>
        <ThemeCard />
      </div>

      {/* Card 7: Developer Mode — admin only */}
      {(!roleLoaded || isAdmin()) && (
        <div className="animate-stagger-in" style={{ animationDelay: "450ms" }}>
          <DeveloperModeCard
            enabled={displayDevMode}
            onToggle={handleToggleDevMode}
            saving={savingDevMode}
          />
        </div>
      )}

      {/* Card 8: External API Keys (developer mode + admin only) */}
      {(!roleLoaded || isAdmin()) && displayDevMode && <div className="animate-stagger-in" style={{ animationDelay: "510ms" }}><ExternalApiKeysSection /></div>}

      {/* Card 9: BossBoard API Keys (developer mode + admin only) */}
      {(!roleLoaded || isAdmin()) && displayDevMode && <div className="animate-stagger-in" style={{ animationDelay: "570ms" }}><ApiKeysSection /></div>}
    </div>
  );
}

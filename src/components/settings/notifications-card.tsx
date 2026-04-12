"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NotificationSettings {
  [key: string]: boolean | undefined;
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
      <div className="rounded-md border overflow-x-auto">
        <div className="flex items-center border-b px-4 py-2 text-xs text-muted-foreground min-w-[360px]">
          <span className="flex-1">Event</span>
          <span className="w-16 text-center">In-app</span>
          <span className="w-16 text-center">Email</span>
        </div>
        {rows.map((row) => (
          <div key={row.app} className="flex items-center px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 min-w-[360px]">
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

const ANNOUNCEMENT_CATEGORIES = [
  { key: "magazine", label: "Magazine / Newsletter" },
  { key: "bugfix", label: "Bug Fixes" },
  { key: "feature", label: "New Features" },
  { key: "promo", label: "Promotions & Offers" },
  { key: "general", label: "General Updates" },
] as const;

type AnnouncementPrefsState = Record<string, boolean>;

function AnnouncementPrefs() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<AnnouncementPrefsState>({
    magazine: true,
    bugfix: true,
    feature: true,
    promo: false,
    general: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_notification_prefs")
      .select("magazine, bugfix, feature, promo, general")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPrefs(data as AnnouncementPrefsState);
    }
    setLoaded(true);
  }, [supabase]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  async function handleToggle(key: string, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("user_notification_prefs")
      .upsert({
        user_id: user.id,
        ...prefs,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast.error("Failed to save announcement preferences");
    } else {
      toast.success("Announcement preferences saved");
    }
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Announcements</h3>
      <p className="text-xs text-muted-foreground">
        Choose which announcement categories you want to see.
      </p>
      <div className="rounded-md border">
        {ANNOUNCEMENT_CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30"
          >
            <span className="text-sm">{cat.label}</span>
            <Switch
              checked={prefs[cat.key] ?? true}
              onCheckedChange={(v) => handleToggle(cat.key, v)}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Announcement Preferences"}
      </Button>
    </div>
  );
}

interface NotificationsCardProps {
  isProOrAbove: boolean;
  notifications: NotificationSettings;
  onToggle: (key: string, value: boolean) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}

export function NotificationsCard({
  isProOrAbove,
  notifications,
  onToggle,
  onSave,
  saving,
  disabled,
}: NotificationsCardProps) {
  return (
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
            ]} notifications={notifications} onToggle={onToggle} />

            <NotifSection title="Documents" rows={[
              { label: "New document published", app: "new_document_app", email: "new_document_email" },
              { label: "Document assigned to me", app: "document_assigned_app", email: "document_assigned_email" },
            ]} notifications={notifications} onToggle={onToggle} />

            <NotifSection title="Team & Communication" rows={[
              { label: "New board post", app: "board_post_app", email: "board_post_email" },
              { label: "Journal feedback received", app: "journal_feedback_app", email: "journal_feedback_email" },
              { label: "Journal not submitted (admin)", app: "journal_missing_app", email: "journal_missing_email" },
              { label: "New team member joined", app: "new_team_member_app", email: "new_team_member_email" },
            ]} notifications={notifications} onToggle={onToggle} />

            <AnnouncementPrefs />

            <Button type="button" onClick={onSave} disabled={saving || disabled}>
              {saving ? "Saving..." : "Save Notifications"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

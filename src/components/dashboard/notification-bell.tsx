"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  CheckSquare,
  FileText,
  Users,
  Newspaper,
  Bug,
  Sparkles,
  Tag,
  Megaphone,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  isRead: boolean;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  checklist_due: CheckSquare,
  sop_update: FileText,
  team_activity: Users,
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  magazine: Newspaper,
  bugfix: Bug,
  feature: Sparkles,
  promo: Tag,
  general: Megaphone,
};

export function NotificationBell() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tab, setTab] = useState<"notifications" | "announcements">("notifications");
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load notifications
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications(data ?? []);

    // Load announcements with read status and user prefs
    const [announcementsRes, readsRes, prefsRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, category, attachment_url, attachment_name, target_plan, created_at")
        .lte("scheduled_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id),
      supabase
        .from("user_notification_prefs")
        .select("magazine, bugfix, feature, promo, general")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const readIds = new Set((readsRes.data ?? []).map((r: { announcement_id: string }) => r.announcement_id));
    const prefs = prefsRes.data ?? { magazine: true, bugfix: true, feature: true, promo: false, general: true };

    const filtered = (announcementsRes.data ?? [])
      .filter((a: { category: string }) => prefs[a.category as keyof typeof prefs] !== false)
      .map((a: { id: string; title: string; body: string; category: string; attachment_url: string | null; attachment_name: string | null; created_at: string }) => ({
        ...a,
        isRead: readIds.has(a.id),
      }));

    setAnnouncements(filtered);
  }, [supabase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markAnnouncementRead(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("announcement_reads")
      .upsert({ user_id: user.id, announcement_id: id });
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  }

  function handleClick(notif: Notification) {
    markAsRead(notif.id);
    if (notif.link) {
      router.push(notif.link);
      setOpen(false);
    }
  }

  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const unreadAnnouncementCount = announcements.filter((a) => !a.isRead).length;
  const unreadCount = unreadNotifCount + unreadAnnouncementCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-badge-pop">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 animate-popover-enter">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
              tab === "notifications"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Notifications
            {unreadNotifCount > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-white">
                {unreadNotifCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
              tab === "announcements"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Announcements
            {unreadAnnouncementCount > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-white">
                {unreadAnnouncementCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications tab */}
        {tab === "notifications" && (
          <>
            {unreadNotifCount > 0 && (
              <div className="flex justify-end px-4 py-1.5">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-primary hover:underline"
                >
                  Mark all read
                </button>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] ?? Bell;
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleClick(notif)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-muted/50",
                        !notif.read && "bg-primary/5"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", !notif.read && "font-medium")}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {notif.message}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Announcements tab */}
        {tab === "announcements" && (
          <div className="max-h-80 overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No announcements
              </div>
            ) : (
              announcements.map((a) => {
                const CatIcon = CATEGORY_ICONS[a.category] ?? Megaphone;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => markAnnouncementRead(a.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-muted/50",
                      !a.isRead && "bg-primary/5"
                    )}
                  >
                    <CatIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !a.isRead && "font-medium")}>
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {a.body}
                      </p>
                      {a.attachment_url && (
                        <a
                          href={a.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          {a.attachment_name || "Download"}
                        </a>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!a.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

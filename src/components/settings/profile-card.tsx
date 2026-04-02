"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { userKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface ProfileCardProps {
  userId: string;
  initialName: string;
  initialAvatarUrl?: string | null;
  isFetching: boolean;
}

export function ProfileCard({ userId, initialName, initialAvatarUrl, isFetching }: ProfileCardProps) {
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const displayName = nameInput ?? initialName;
  const displayAvatar = avatarUrl ?? initialAvatarUrl;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "";

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Image must be under 2MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const uuid = crypto.randomUUID();
      const path = `avatars/${userId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError.message);
        toast.error("Failed to upload avatar. Please try again.");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Avatar URL save error:", updateError.message);
        toast.error("Failed to save avatar. Please try again.");
        return;
      }

      setAvatarUrl(publicUrl);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({
        ...old,
        avatar_url: publicUrl,
      }));
      toast.success("Avatar updated");
    } catch (err) {
      console.error("Avatar upload exception:", err);
      toast.error("Failed to upload avatar.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const nameToSave = nameInput ?? initialName;
    if (!nameToSave?.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: nameToSave.trim() }).eq("id", userId);
    if (error) { console.error("Profile update error:", error.message); toast.error("Failed to update profile. Please try again."); }
    else {
      toast.success("Profile updated");
      setNameInput(null);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, full_name: nameToSave.trim() }));
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="group relative h-16 w-16 shrink-0 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Upload profile photo"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-lg font-bold">
                  {initial}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="text-sm text-muted-foreground">
              Click to upload a profile photo
            </div>
          </div>

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={displayName} onChange={(e) => setNameInput(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving || isFetching}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

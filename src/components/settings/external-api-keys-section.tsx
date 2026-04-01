"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUser, fetchProfile, userKeys } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";

interface ExternalKeys {
  [key: string]: string | undefined;
}

const KEY_FIELDS = [
  {
    key: "anthropic",
    label: "Anthropic API Key",
    placeholder: "sk-ant-api03-...",
    description: "Use your own Anthropic key for AI features instead of BossBoard credits.",
  },
  {
    key: "openai",
    label: "OpenAI API Key",
    placeholder: "sk-...",
    description: "Connect OpenAI models for alternative AI generation.",
  },
  {
    key: "custom_webhook",
    label: "Custom Webhook URL",
    placeholder: "https://your-service.com/webhook",
    description: "Send BossBoard events to your own webhook endpoint.",
  },
];

export function ExternalApiKeysSection() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const [keys, setKeys] = useState<ExternalKeys | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const displayKeys: ExternalKeys = keys ?? profile?.external_api_keys ?? {};

  function updateKey(field: string, value: string) {
    setKeys((prev) => ({ ...(prev ?? displayKeys), [field]: value }));
  }

  function toggleVisibility(field: string) {
    setVisibleKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function maskValue(value: string | undefined): string {
    if (!value) return "";
    if (value.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    return value.slice(0, 7) + "\u2022".repeat(Math.min(20, value.length - 7)) + value.slice(-4);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    const cleanKeys: ExternalKeys = {};
    for (const [k, v] of Object.entries(displayKeys)) {
      if (v?.trim()) cleanKeys[k] = v.trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update({ external_api_keys: cleanKeys })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("API keys saved");
      setKeys(null);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({
        ...old,
        external_api_keys: cleanKeys,
      }));
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>External API Keys</CardTitle>
        <CardDescription>Connect external services. Keys are stored securely and never shared.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {KEY_FIELDS.map((field) => {
          const currentValue = displayKeys[field.key] ?? "";
          const isVisible = visibleKeys[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm font-medium">{field.label}</Label>
              <div className="relative">
                <Input
                  type={isVisible ? "text" : "password"}
                  value={isVisible ? currentValue : (currentValue ? maskValue(currentValue) : "")}
                  onChange={(e) => {
                    if (!isVisible) setVisibleKeys((prev) => ({ ...prev, [field.key]: true }));
                    updateKey(field.key, e.target.value);
                  }}
                  placeholder={field.placeholder}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(field.key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={saving} className="mt-2">
          {saving ? "Saving..." : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Keys
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

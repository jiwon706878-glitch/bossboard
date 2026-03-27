"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Key, Copy, Trash2, Loader2, Plus, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export function ApiKeysSection() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadKeys() {
    const res = await fetch("/api/v1/keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }

  useEffect(() => { loadKeys(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim() || !currentBusiness?.id) return;
    setCreating(true);

    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim(), businessId: currentBusiness.id }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to create key");
    } else {
      setNewRawKey(data.key);
      setNewKeyName("");
      loadKeys();
      toast.success("API key created");
    }
    setCreating(false);
  }

  async function handleDelete(keyId: string) {
    setDeletingId(keyId);
    const res = await fetch(`/api/v1/keys?id=${keyId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("API key revoked");
      loadKeys();
    } else {
      toast.error("Failed to revoke key");
    }
    setDeletingId(null);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" /> API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          API keys allow external agents and integrations to access your BossBoard data.
          Keys are shown once on creation — save them securely.
        </p>

        {/* Newly created key display */}
        {newRawKey && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Save this key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={showKey ? newRawKey : "••••••••••••••••••••••••"}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(newRawKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setNewRawKey(null); setShowKey(false); }}>
              Done
            </Button>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Key name</Label>
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Claude Agent, n8n workflow"
              className="text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={creating || !newKeyName.trim()}>
            {creating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
            Create
          </Button>
        </form>

        {/* Keys list */}
        {loading ? (
          <div className="h-16 animate-pulse rounded bg-muted/40" />
        ) : keys.length === 0 ? (
          <p className="text-xs text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.key_prefix}...</p>
                  <p className="text-[10px] text-muted-foreground">
                    Created {format(new Date(k.created_at), "MMM d, yyyy")}
                    {k.last_used_at && ` · Last used ${format(new Date(k.last_used_at), "MMM d")}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive shrink-0"
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                >
                  {deletingId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

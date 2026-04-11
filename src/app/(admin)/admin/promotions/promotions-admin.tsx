"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy, Tag } from "lucide-react";

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: string[];
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  ends_at: string | null;
  paddle_discount_id: string | null;
  show_banner: boolean;
  banner_text: string | null;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  coupon_type: "discount";
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
  applies_to: string[] | null;
  paddle_discount_id: string | null;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  created_at: string;
}

const PLANS: Array<"starter" | "pro" | "business"> = [
  "starter",
  "pro",
  "business",
];

// ─── Main component ─────────────────────────────────────────────────────────

export function PromotionsAdmin({
  initialPromotions,
  initialCoupons,
}: {
  initialPromotions: Promotion[];
  initialCoupons: Coupon[];
}) {
  const [tab, setTab] = useState<"promotions" | "coupons">("promotions");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Tag className="h-7 w-7" /> Promotions & Coupons
        </h1>
        <p className="text-muted-foreground">
          Manage site-wide promotions and redeemable coupon codes without
          touching code.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {(["promotions", "coupons"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "promotions" ? "Promotions" : "Coupons"}
            {tab === key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "promotions" ? (
        <PromotionsTab initial={initialPromotions} />
      ) : (
        <CouponsTab initial={initialCoupons} />
      )}
    </div>
  );
}

// ─── Promotions tab ─────────────────────────────────────────────────────────

function PromotionsTab({ initial }: { initial: Promotion[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  async function togglePromo(p: Promotion) {
    const res = await fetch(`/api/admin/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) {
      toast.success(p.is_active ? "Promotion paused" : "Promotion activated");
      startTransition(() => router.refresh());
    } else {
      toast.error("Failed to update");
    }
  }

  async function deletePromo(id: string) {
    if (!confirm("Delete this promotion? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Promotion deleted");
      startTransition(() => router.refresh());
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((s) => !s)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New Promotion"}
        </Button>
      </div>

      {showForm && (
        <CreatePromotionForm
          onCreated={() => {
            setShowForm(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {initial.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No promotions yet. Click “New Promotion” to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initial.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Badge
                        variant={p.is_active ? "default" : "secondary"}
                        className={p.is_active ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" : ""}
                      >
                        {p.is_active ? "🟢 Active" : "⚫ Inactive"}
                      </Badge>
                      {p.max_uses !== null && (
                        <span className="text-xs text-muted-foreground">
                          {p.current_uses} / {p.max_uses} used
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {p.discount_type === "percent"
                          ? `${p.discount_value}% off`
                          : `$${p.discount_value} off`}
                      </span>
                      <span>Applies to: {p.applies_to.join(", ")}</span>
                      {p.paddle_discount_id && (
                        <span>Paddle ID: {p.paddle_discount_id}</span>
                      )}
                      {p.ends_at && (
                        <span>
                          Ends: {new Date(p.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {p.max_uses !== null && (
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, (p.current_uses / p.max_uses) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePromo(p)}
                      disabled={pending}
                    >
                      {p.is_active ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePromo(p.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePromotionForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("30");
  const [appliesTo, setAppliesTo] = useState<Set<string>>(
    new Set(["starter", "pro", "business"])
  );
  const [isActive, setIsActive] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [paddleDiscountId, setPaddleDiscountId] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        applies_to: Array.from(appliesTo),
        is_active: isActive,
        max_uses: maxUses ? Number(maxUses) : null,
        ends_at: endsAt || null,
        paddle_discount_id: paddleDiscountId || null,
        banner_text: bannerText || null,
        show_banner: showBanner,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Promotion created");
      onCreated();
    } else {
      const err = await res.json().catch(() => ({ error: "unknown" }));
      toast.error(`Failed: ${err.error ?? "unknown"}`);
    }
  }

  function toggleApplies(plan: string) {
    setAppliesTo((prev) => {
      const next = new Set(prev);
      if (next.has(plan)) next.delete(plan);
      else next.add(plan);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Promotion</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Black Friday 2026"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal note about the promotion"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount type</Label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "fixed")
                }
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label>Applies to plans</Label>
            <div className="mt-2 flex gap-3">
              {PLANS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="checkbox"
                    checked={appliesTo.has(p)}
                    onChange={() => toggleApplies(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max uses (optional)</Label>
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Ends at (optional)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Paddle discount ID (optional)</Label>
            <Input
              value={paddleDiscountId}
              onChange={(e) => setPaddleDiscountId(e.target.value)}
              placeholder="dsc_01abc... (created in Paddle dashboard)"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Create the discount in Paddle manually, then paste the ID here so
              checkout applies it automatically.
            </p>
          </div>
          <div>
            <Label>Banner text</Label>
            <Input
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="🎉 30% off all paid plans"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showBanner}
                onChange={(e) => setShowBanner(e.target.checked)}
              />
              Show banner on landing
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Activate immediately
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create promotion"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Coupons tab ────────────────────────────────────────────────────────────

function CouponsTab({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon? Existing redemptions will remain."))
      return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Coupon deleted");
      startTransition(() => router.refresh());
    } else {
      toast.error("Failed to delete");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(`Copied ${code}`),
      () => toast.error("Clipboard unavailable")
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((s) => !s)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New Coupon"}
        </Button>
      </div>

      {showForm && (
        <CreateCouponForm
          onCreated={() => {
            setShowForm(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {initial.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No coupons yet. Generate one with the button above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {initial.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                        {c.code}
                      </code>
                      <Badge variant="outline">Discount</Badge>
                      <span className="text-xs text-muted-foreground">
                        {c.current_uses} / {c.max_uses} used
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {`${c.discount_value}${c.discount_type === "percent" ? "%" : "$"} off ${c.applies_to?.join(", ") ?? "all plans"}`}
                      {c.expires_at &&
                        ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyCode(c.code)}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteCoupon(c.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCouponForm({ onCreated }: { onCreated: () => void }) {
  // Day 5 dropped credit-type coupons; only discount coupons remain.
  const [customCode, setCustomCode] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [paddleDiscountId, setPaddleDiscountId] = useState("");
  const [appliesTo, setAppliesTo] = useState<Set<string>>(
    new Set(["starter", "pro", "business"])
  );

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      coupon_type: "discount",
      code: customCode || undefined,
      max_uses: Number(maxUses),
      expires_at: expiresAt || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      applies_to: Array.from(appliesTo),
      paddle_discount_id: paddleDiscountId || null,
    };
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`Created ${data.coupon?.code ?? "coupon"}`);
      onCreated();
    } else {
      const err = await res.json().catch(() => ({ error: "unknown" }));
      toast.error(`Failed: ${err.error ?? "unknown"}`);
    }
  }

  function toggleApplies(plan: string) {
    setAppliesTo((prev) => {
      const next = new Set(prev);
      if (next.has(plan)) next.delete(plan);
      else next.add(plan);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Coupon</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount type</Label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "fixed")
                }
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label>Applies to plans</Label>
            <div className="mt-2 flex gap-3">
              {PLANS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="checkbox"
                    checked={appliesTo.has(p)}
                    onChange={() => toggleApplies(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Paddle discount ID (optional)</Label>
            <Input
              value={paddleDiscountId}
              onChange={(e) => setPaddleDiscountId(e.target.value)}
              placeholder="dsc_01abc..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max uses</Label>
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Expires (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Custom code (optional)</Label>
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="Auto-generate as BB-XXXXXXXX"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create coupon"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [menuOrServices, setMenuOrServices] = useState("");
  const [brandTone, setBrandTone] = useState("professional");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState("");
  const [seasonalPromotions, setSeasonalPromotions] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);

  const planId = ((currentBusiness as any)?.plan || "free") as PlanId;
  const plan = plans[planId];
  const maxMembers = plan?.limits?.teamMembers ?? 1;

  const loadTeamData = useCallback(async () => {
    if (!currentBusiness) return;

    // Load team members
    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("business_id", currentBusiness.id);

    if (members) setTeamMembers(members);

    // Load pending invites
    const { data: invites } = await supabase
      .from("invites")
      .select("id, email, role, accepted, created_at")
      .eq("workspace_id", currentBusiness.id)
      .eq("accepted", false)
      .order("created_at", { ascending: false });

    if (invites) setPendingInvites(invites);
  }, [currentBusiness, supabase]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setFullName(profile.full_name);

      if (currentBusiness) {
        setBusinessName(currentBusiness.name);
        setBusinessAddress(currentBusiness.address || "");

        const { data: biz } = await supabase
          .from("businesses")
          .select(
            "menu_or_services, brand_tone, target_customers, competitive_advantage, seasonal_promotions"
          )
          .eq("id", currentBusiness.id)
          .single();

        if (biz) {
          setMenuOrServices(biz.menu_or_services || "");
          setBrandTone(biz.brand_tone || "professional");
          setTargetCustomers(biz.target_customers || "");
          setCompetitiveAdvantage(biz.competitive_advantage || "");
          setSeasonalPromotions(biz.seasonal_promotions || "");
        }
      }
    }
    load();
    loadTeamData();
  }, [currentBusiness]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
    }
    setLoading(false);
  }

  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("businesses")
      .update({
        name: businessName,
        address: businessAddress || null,
      })
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
    setLoading(false);
  }

  async function handleSaveAIProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    setProfileLoading(true);

    const { data, error } = await supabase
      .from("businesses")
      .update({
        menu_or_services: menuOrServices || null,
        brand_tone: brandTone,
        target_customers: targetCustomers || null,
        competitive_advantage: competitiveAdvantage || null,
        seasonal_promotions: seasonalPromotions || null,
      })
      .eq("id", currentBusiness.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("AI Business Profile saved");
      if (data) setCurrentBusiness(data);
    }
    setProfileLoading(false);
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !inviteEmail.trim()) return;
    setInviteLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          businessId: currentBusiness.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send invite");
      } else {
        toast.success(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteRole("member");
        loadTeamData();
      }
    } catch {
      toast.error("Failed to send invite");
    }

    setInviteLoading(false);
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevokeLoadingId(inviteId);

    try {
      const res = await fetch(`/api/team/invite?id=${inviteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to revoke invite");
      } else {
        toast.success("Invite revoked");
        loadTeamData();
      }
    } catch {
      toast.error("Failed to revoke invite");
    }

    setRevokeLoadingId(null);
  }

  const totalUsed = teamMembers.length + pendingInvites.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and business settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading || !currentBusiness}>
              Save Business
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Business Profile</CardTitle>
          <CardDescription>
            Tell us about your business so every AI-generated response — review
            replies, captions, scripts, emails — feels personalized to your
            brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAIProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>What you sell or offer</Label>
              <Textarea
                value={menuOrServices}
                onChange={(e) => setMenuOrServices(e.target.value)}
                placeholder="e.g., Specialty lattes, avocado toast, weekend brunch menu, catering for events..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand tone</Label>
              <Select value={brandTone} onValueChange={setBrandTone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target customers</Label>
              <Textarea
                value={targetCustomers}
                onChange={(e) => setTargetCustomers(e.target.value)}
                placeholder="e.g., Young professionals aged 25-40, families in the neighborhood, health-conscious foodies..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>What makes you special</Label>
              <Textarea
                value={competitiveAdvantage}
                onChange={(e) => setCompetitiveAdvantage(e.target.value)}
                placeholder="e.g., Only shop in town with locally roasted beans, 20 years of family recipes, award-winning service..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Current promotions or events</Label>
              <Textarea
                value={seasonalPromotions}
                onChange={(e) => setSeasonalPromotions(e.target.value)}
                placeholder="e.g., Summer happy hour 4-6pm, 20% off first visit, grand opening next week..."
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={profileLoading || !currentBusiness}
            >
              {profileLoading ? "Saving..." : "Save AI Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team</CardTitle>
              <CardDescription>
                Manage team members and invitations.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {totalUsed}/{maxMembers} members
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Team Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Current Members
              </h3>
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {member.full_name || "Unnamed"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {member.role || "member"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Pending Invites
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border border-dashed px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {invite.role}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={revokeLoadingId === invite.id}
                    >
                      {revokeLoadingId === invite.id ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Invite Form */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Invite a Team Member
            </h3>
            {totalUsed >= maxMembers ? (
              <p className="text-sm text-muted-foreground">
                You've reached the team member limit for your {plan.name} plan.
                Upgrade to invite more members.
              </p>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="colleague@business.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={inviteLoading || !currentBusiness}
                >
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

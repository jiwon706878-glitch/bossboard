"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
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
import { toast } from "sonner";

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
  const supabase = createClient();
  const router = useRouter();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);

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

        // Load full business profile from DB for AI context fields
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const businessTypes = [
  "Restaurant",
  "Retail Store",
  "Salon / Barbershop",
  "Gym / Fitness",
  "Auto Shop",
  "Medical / Dental",
  "Real Estate",
  "Home Services",
  "Professional Services",
  "Other",
];

const roles = [
  "Owner",
  "Manager",
  "Operations Lead",
  "Administrator",
  "Team Lead",
  "Other",
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);

  useEffect(() => {
    async function prefill() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    }
    prefill();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        role: role,
      });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  }

  async function handleCreateBusiness() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return false;
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        user_id: user.id,
        name: businessName,
        type: businessType,
        address: address || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return false;
    }

    setCurrentBusiness(data);
    setLoading(false);
    return true;
  }

  async function handleNext() {
    if (step === 1) {
      if (!fullName.trim() || !role) {
        toast.error("Please fill in all required fields");
        return;
      }
      const ok = await handleSaveProfile();
      if (ok) setStep(2);
    } else if (step === 2) {
      if (!businessName.trim() || !businessType) {
        toast.error("Please fill in business name and type");
        return;
      }
      const ok = await handleCreateBusiness();
      if (ok) setStep(3);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleGoToDashboard() {
    toast.success("Welcome to BossBoard!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium text-foreground">
              {step === 1 && "About You"}
              {step === 2 && "Your Business"}
              {step === 3 && "All Set"}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <Card className="w-full border bg-card">
          {/* Step 1: About You */}
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">About You</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Let us know who you are so we can personalize your experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full name</Label>
                  <Input
                    id="fullName"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-foreground">Your role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Your Business */}
          {step === 2 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">Your Business</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Tell us about your business so we can tailor the AI to your
                  needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-foreground">Business name</Label>
                  <Input
                    id="businessName"
                    placeholder="Acme Coffee Shop"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-background border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType" className="text-foreground">Business type</Label>
                  <Select
                    value={businessType}
                    onValueChange={setBusinessType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground">Address (optional)</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-background border"
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: All Set */}
          {step === 3 && (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">You're All Set</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Here's a summary of your setup. You can change these later in
                  Settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border bg-background p-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{fullName}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{role}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Business</p>
                    <p className="font-medium">{businessName}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{businessType}</p>
                  </div>
                  {address && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{address}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            {step > 1 && step < 3 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading} className="transition-colors duration-150">
                {loading ? "Saving..." : "Next"}
              </Button>
            ) : (
              <Button onClick={handleGoToDashboard} className="w-full transition-colors duration-150">
                Go to Dashboard
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

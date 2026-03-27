"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

type InviteState = "loading" | "accepting" | "accepted" | "error" | "login-required";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { setCurrentBusiness } = useBusinessStore();

  const [state, setState] = useState<InviteState>("loading");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    async function processInvite() {
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState("login-required");
        return;
      }

      // Validate the invite token
      const { data: invite } = await supabase
        .from("invites")
        .select("id, workspace_id, business_id, email, role, accepted, status, expires_at")
        .eq("token", token)
        .single();

      if (!invite) {
        setState("error");
        setError("This invite link is invalid or has been revoked.");
        return;
      }

      if (invite.accepted || invite.status === "accepted") {
        setState("error");
        setError("This invite has already been used.");
        return;
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setState("error");
        setError("This invite has expired. Ask your team admin for a new one.");
        return;
      }

      const businessId = invite.business_id || invite.workspace_id;

      // Get business name for display
      const { data: business } = await supabase
        .from("businesses")
        .select("id, name, type")
        .eq("id", businessId)
        .single();

      if (business) {
        setBusinessName(business.name);
      }
      setRole(invite.role || "member");

      // Accept the invite
      setState("accepting");

      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(data.error || "Failed to accept invite.");
        return;
      }

      // Set the business in the store so dashboard loads it
      if (business) {
        setCurrentBusiness(business as any);
      }

      setState("accepted");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }

    processInvite();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLoginRedirect() {
    // Store the invite token so we can resume after login
    sessionStorage.setItem("pending_invite_token", token);
    router.push(`/login?next=/invite/${token}`);
  }

  function handleSignupRedirect() {
    sessionStorage.setItem("pending_invite_token", token);
    router.push(`/signup?next=/invite/${token}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Team Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating invite...</p>
            </div>
          )}

          {state === "accepting" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Joining {businessName || "team"}...
              </p>
            </div>
          )}

          {state === "accepted" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p className="font-medium">
                You&apos;ve joined {businessName || "the team"}!
              </p>
              <p className="text-sm text-muted-foreground">
                Role: {role}. Redirecting to dashboard...
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-center text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}

          {state === "login-required" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-center text-sm text-muted-foreground">
                {businessName
                  ? `You've been invited to join ${businessName}. Sign in or create an account to accept.`
                  : "Sign in or create an account to accept this invite."}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleLoginRedirect}>Sign In</Button>
                <Button variant="outline" onClick={handleSignupRedirect}>
                  Create Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

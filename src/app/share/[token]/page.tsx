"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, FileText, Download } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

const SOPEditor = dynamic(
  () => import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor })),
  { ssr: false, loading: () => <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading...</div> }
);

interface SharedDoc {
  id: string;
  title: string;
  content: JSONContent | null;
  summary: string | null;
  category: string | null;
  doc_type: string;
  copy_protected: boolean;
  created_at: string;
  updated_at: string;
}

type PageState = "loading" | "password" | "ready" | "error";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState("");
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function fetchDoc(pw?: string) {
    const params = new URLSearchParams({ token });
    if (pw) params.set("password", pw);

    const res = await fetch(`/api/share?${params}`);
    const data = await res.json();

    if (res.status === 401 && data.requiresPassword) {
      setState("password");
      if (data.error) setError(data.error);
      return;
    }

    if (!res.ok) {
      setState("error");
      setError(data.error || "Failed to load document");
      return;
    }

    setDoc(data.sop);
    setBusinessName(data.businessName || "");
    setAllowDownload(data.allowDownload);
    setState("ready");
  }

  useEffect(() => { fetchDoc(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");
    await fetchDoc(password);
    setPasswordLoading(false);
  }

  // Copy protection effects
  useEffect(() => {
    if (!doc?.copy_protected) return;

    function blockCopy(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        alert("This document is copy protected.");
      }
    }
    function blockContext(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-copy-protected]")) e.preventDefault();
    }

    document.addEventListener("keydown", blockCopy);
    document.addEventListener("contextmenu", blockContext);
    return () => {
      document.removeEventListener("keydown", blockCopy);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [doc?.copy_protected]);

  function handlePrint() {
    if (doc?.copy_protected) {
      alert("This document is copy protected.");
      return;
    }
    window.print();
  }

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Password gate ───────────────────────────────────────────────────────
  if (state === "password") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                This document is password protected.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={passwordLoading || !password}>
                  {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Unlock
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-3">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/">
            <Button variant="outline" size="sm">Go to BossBoard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Document view ───────────────────────────────────────────────────────
  if (!doc) return null;

  const isCopyProtected = doc.copy_protected;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="BossBoard" width={24} height={24} className="h-6 w-6" />
            <span className="text-sm font-medium">BossBoard</span>
            {businessName && (
              <span className="text-xs text-muted-foreground">/ {businessName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allowDownload && !isCopyProtected && (
              <Button variant="ghost" size="sm" onClick={handlePrint}>
                <Download className="mr-1 h-4 w-4" /> PDF
              </Button>
            )}
            <Link href="/signup">
              <Button size="sm">Save to BossBoard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
            {doc.summary && (
              <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
            )}
          </div>

          {isCopyProtected && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5" />
              This document is copy protected.
            </div>
          )}

          <Card className="border bg-card">
            <CardContent
              className="py-6"
              data-copy-protected={isCopyProtected || undefined}
              style={isCopyProtected ? { userSelect: "none", WebkitUserSelect: "none" } : undefined}
            >
              {doc.content ? (
                <SOPEditor content={doc.content} editable={false} />
              ) : (
                <p className="text-sm text-muted-foreground">No content.</p>
              )}
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="rounded-md border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Create SOPs, checklists, and team wikis with AI.
            </p>
            <Link href="/signup">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

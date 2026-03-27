import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId, password, expiresInDays, allowDownload } = await req.json();
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  // Verify the SOP exists and user owns the business
  const { data: sop } = await supabase
    .from("sops")
    .select("id, business_id")
    .eq("id", sopId)
    .single();

  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  const token = crypto.randomUUID();
  let passwordHash: string | null = null;

  if (password) {
    // Simple hash for password protection — use Web Crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: link, error } = await supabase
    .from("shared_links")
    .insert({
      sop_id: sopId,
      business_id: sop.business_id,
      token,
      password_hash: passwordHash,
      expires_at: expiresAt,
      allow_download: allowDownload ?? true,
      created_by: user.id,
    })
    .select("id, token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({ token: link.token, url: `${appUrl}/share/${link.token}` });
}

// GET: public endpoint to fetch shared document data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const password = searchParams.get("password");

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("shared_links")
    .select("id, sop_id, business_id, password_hash, expires_at, allow_download, view_count")
    .eq("token", token)
    .single();

  if (!link) return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  // Check password
  if (link.password_hash) {
    if (!password) {
      return NextResponse.json({ requiresPassword: true }, { status: 401 });
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== link.password_hash) {
      return NextResponse.json({ error: "Incorrect password", requiresPassword: true }, { status: 401 });
    }
  }

  // Fetch the SOP content
  const { data: sop } = await admin
    .from("sops")
    .select("id, title, content, summary, category, doc_type, copy_protected, created_at, updated_at")
    .eq("id", link.sop_id)
    .single();

  if (!sop) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Get business name
  const { data: business } = await admin
    .from("businesses")
    .select("name")
    .eq("id", link.business_id)
    .single();

  // Increment view count (fire-and-forget)
  admin
    .from("shared_links")
    .update({ view_count: (link.view_count || 0) + 1 })
    .eq("id", link.id)
    .then(() => {});

  return NextResponse.json({
    sop: {
      id: sop.id,
      title: sop.title,
      content: sop.content,
      summary: sop.summary,
      category: sop.category,
      doc_type: sop.doc_type,
      copy_protected: sop.copy_protected,
      created_at: sop.created_at,
      updated_at: sop.updated_at,
    },
    businessName: business?.name || null,
    allowDownload: link.allow_download,
  });
}

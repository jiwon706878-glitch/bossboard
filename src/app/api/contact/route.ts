import { sendEmail, contactEmailHtml } from "@/lib/email";

// Simple in-memory rate limiter for contact form (per IP, 3 per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  // Rate limit by IP to prevent email spam
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 3) {
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
  }

  const { name, email, message, subject } = await req.json();

  if (!name || !email || !message) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response("Invalid email format", { status: 400 });
  }

  const to = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || "jiwon706878@gmail.com";

  try {
    await sendEmail({
      to,
      subject: subject || `New contact form submission from ${name}`,
      html: contactEmailHtml({ name, email, message, subject }),
      replyTo: email,
    });
  } catch (err) {
    console.error("Failed to send contact email:", err);
  }

  return Response.json({ success: true });
}

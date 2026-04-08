import { sendEmail, contactEmailHtml } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limit by IP to prevent email spam (3 per minute)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`contact:${ip}`, 3, 60_000)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { name, email, message, subject } = await req.json();

  if (!name || !email || !message) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response("Invalid email format", { status: 400 });
  }

  const to = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL;
  if (!to) {
    console.error("[contact] No CONTACT_EMAIL or ADMIN_EMAIL configured");
    return Response.json({ success: true });
  }

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

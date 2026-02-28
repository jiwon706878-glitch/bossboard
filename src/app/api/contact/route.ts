import { Resend } from "resend";

export async function POST(req: Request) {
  const { name, email, message, subject } = await req.json();

  if (!name || !email || !message) {
    return new Response("Missing required fields", { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "BossBoard <onboarding@resend.dev>",
        to: "jiwon706878@gmail.com",
        subject: subject || `New contact form submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        replyTo: email,
      });
    } catch (error) {
      console.error("Failed to send contact email:", error);
    }
  } else {
    // No Resend key configured — log for manual follow-up
    console.log("Contact submission (no email key):", { name, email, message });
  }

  return Response.json({ success: true });
}

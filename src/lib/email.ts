import { Resend } from "resend";

// ─── Singleton Resend client ────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// ─── HTML escaping ──────────────────────────────────────────────────────────

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape user-provided strings before embedding in HTML email templates. */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

// ─── Brand constants ────────────────────────────────────────────────────────

const BRAND = {
  name: "BossBoard",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://mybossboard.com",
  from: "BossBoard <noreply@mybossboard.com>" as const,
  color: "#3366FF",
  textDark: "#1A1D2B",
  textMuted: "#5E6478",
  textLight: "#8B95B0",
  bgLight: "#F7F8FA",
  border: "#E2E6EF",
};

// ─── Shared template wrapper ────────────────────────────────────────────────

/**
 * Wraps email body content in a consistent branded shell:
 * - Top bar with accent color
 * - BossBoard wordmark
 * - Content area
 * - Footer with unsubscribe-style disclaimer
 */
export function emailTemplate(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bgLight}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.bgLight};">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
        <!-- Accent bar -->
        <tr><td style="height: 4px; background: ${BRAND.color}; border-radius: 4px 4px 0 0;"></td></tr>
        <!-- Card -->
        <tr><td style="background: #ffffff; padding: 36px 32px 32px; border: 1px solid ${BRAND.border}; border-top: none; border-radius: 0 0 4px 4px;">
          <!-- Logo / Wordmark -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom: 28px; border-bottom: 1px solid ${BRAND.border};">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: ${BRAND.textDark}; letter-spacing: -0.02em;">Boss<span style="color: ${BRAND.color};">Board</span></span>
            </td></tr>
          </table>
          <!-- Body -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-top: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: ${BRAND.textDark};">
              ${body}
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 20px 0; text-align: center;">
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: ${BRAND.textLight}; line-height: 1.5;">
            <a href="${BRAND.url}" style="color: ${BRAND.textLight}; text-decoration: underline;">${BRAND.name}</a> &mdash; The operations wiki for small business.
          </p>
          <p style="margin: 4px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${BRAND.textLight};">
            You received this email because of your account at mybossboard.com.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Pre-built emails ───────────────────────────────────────────────────────

export function inviteEmailHtml(opts: {
  businessName: string;
  role: string;
  inviteUrl: string;
}): string {
  const name = escapeHtml(opts.businessName);
  const role = escapeHtml(opts.role);
  // inviteUrl is constructed server-side from APP_URL + token, not user input
  const url = opts.inviteUrl;

  return emailTemplate(`
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND.textDark};">You're invited!</h2>
    <p style="margin: 0 0 24px; color: ${BRAND.textMuted};">
      You've been invited to join <strong>${name}</strong> as a <strong>${role}</strong> on BossBoard.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td style="border-radius: 6px; background: ${BRAND.color};">
        <a href="${url}" style="display: inline-block; padding: 12px 28px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Accept Invite</a>
      </td></tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.textLight};">
      This invite expires in 7 days. If you didn't expect this, you can safely ignore it.
    </p>
  `);
}

export function welcomeEmailHtml(opts: { name?: string }): string {
  const greeting = opts.name
    ? `Hi ${escapeHtml(opts.name)},`
    : "Welcome,";

  return emailTemplate(`
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND.textDark};">${greeting}</h2>
    <p style="margin: 0 0 16px; color: ${BRAND.textMuted};">
      Your email has been confirmed and your BossBoard account is ready to go.
    </p>
    <p style="margin: 0 0 16px; color: ${BRAND.textMuted};">Here's how to get started:</p>
    <ol style="margin: 0 0 24px; padding-left: 20px; color: ${BRAND.textMuted};">
      <li style="margin-bottom: 8px;">Create your first business workspace</li>
      <li style="margin-bottom: 8px;">Generate an SOP with AI &mdash; just describe any task</li>
      <li style="margin-bottom: 8px;">Invite your team and start tracking</li>
    </ol>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td style="border-radius: 6px; background: ${BRAND.color};">
        <a href="${BRAND.url}/dashboard" style="display: inline-block; padding: 12px 28px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Go to Dashboard</a>
      </td></tr>
    </table>
    <p style="margin: 24px 0 0; font-size: 13px; color: ${BRAND.textLight};">
      Questions? Just reply to this email &mdash; we read every message.
    </p>
  `);
}

export function contactEmailHtml(opts: {
  name: string;
  email: string;
  message: string;
  subject?: string;
}): string {
  const name = escapeHtml(opts.name);
  const email = escapeHtml(opts.email);
  const message = escapeHtml(opts.message);
  const subject = opts.subject ? escapeHtml(opts.subject) : "Contact form";

  return emailTemplate(`
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND.textDark};">${subject}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.textLight}; width: 60px; vertical-align: top;">From</td>
        <td style="padding: 4px 0; font-size: 14px; color: ${BRAND.textDark};">${name} &lt;${email}&gt;</td>
      </tr>
    </table>
    <div style="padding: 16px; background: ${BRAND.bgLight}; border: 1px solid ${BRAND.border}; border-radius: 6px; white-space: pre-wrap; font-size: 14px; color: ${BRAND.textDark}; line-height: 1.6;">${message}</div>
  `);
}

// ─── Send helper ────────────────────────────────────────────────────────────

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend. Returns true on success, false if Resend is not
 * configured or the send fails (never throws).
 */
export async function sendEmail(opts: SendOpts): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log("[email] No RESEND_API_KEY, skipping:", opts.subject);
    return false;
  }
  try {
    await resend.emails.send({
      from: opts.from ?? BRAND.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return true;
  } catch (error) {
    console.error("[email] Send failed:", opts.subject, error);
    return false;
  }
}

/**
 * Admin allow-list. Keep in sync with the same list in
 * supabase/migrations/20260427400000_v4_admin_stats.sql — both layers
 * gate independently (the SQL function is the load-bearing check;
 * the frontend redirect is just to avoid showing a 403 page).
 */
const ADMIN_EMAILS = [
  "jay@mybossboard.com",
  "jiwon706878@gmail.com",
] as const;

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

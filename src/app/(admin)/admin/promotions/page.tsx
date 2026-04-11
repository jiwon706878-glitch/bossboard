import { createAdminClient } from "@/lib/supabase/admin";
import { PromotionsAdmin } from "./promotions-admin";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const supabase = createAdminClient();

  const [promosRes, couponsRes] = await Promise.all([
    supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PromotionsAdmin
      initialPromotions={promosRes.data ?? []}
      initialCoupons={couponsRes.data ?? []}
    />
  );
}

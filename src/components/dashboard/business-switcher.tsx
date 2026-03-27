"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface Business {
  id: string;
  name: string;
  type: string;
  address: string | null;
  google_place_id: string | null;
  menu_or_services: string | null;
  brand_tone: string | null;
  target_customers: string | null;
  competitive_advantage: string | null;
  seasonal_promotions: string | null;
}

export function BusinessSwitcher() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const { currentBusiness, userId, setCurrentBusiness, setUserId, clear } =
    useBusinessStore();
  const supabase = createClient();

  useEffect(() => {
    async function loadBusinesses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Different user logged in — clear stale store
      if (userId && userId !== user.id) {
        clear();
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("businesses")
        .select("id, name, type, address, google_place_id, menu_or_services, brand_tone, target_customers, competitive_advantage, seasonal_promotions")
        .eq("user_id", user.id)
        .order("created_at");

      if (data && data.length > 0) {
        setBusinesses(data);
        if (!currentBusiness || userId !== user.id) {
          setCurrentBusiness(data[0]);
        } else {
          // Verify cached business still belongs to this user
          const fresh = data.find((b) => b.id === currentBusiness.id);
          if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentBusiness)) {
            setCurrentBusiness(fresh);
          } else if (!fresh) {
            setCurrentBusiness(data[0]);
          }
        }
      } else {
        // User has no businesses — clear any stale cached business
        setCurrentBusiness(null);
      }
    }
    loadBusinesses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (businesses.length === 0) return null;

  return (
    <Select
      value={currentBusiness?.id || ""}
      onValueChange={(id) => {
        const biz = businesses.find((b) => b.id === id);
        if (biz) setCurrentBusiness(biz);
      }}
    >
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Select business" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {businesses.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

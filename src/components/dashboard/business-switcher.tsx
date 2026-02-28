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
}

export function BusinessSwitcher() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const { currentBusiness, setCurrentBusiness } = useBusinessStore();
  const supabase = createClient();

  useEffect(() => {
    async function loadBusinesses() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at");

      if (data && data.length > 0) {
        setBusinesses(data);
        if (!currentBusiness) {
          setCurrentBusiness(data[0]);
        }
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

"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchUserBusinesses, userKeys, businessKeys } from "@/lib/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function BusinessSwitcher() {
  const { currentBusiness, userId, setCurrentBusiness, setUserId, clear } =
    useBusinessStore();

  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: businessKeys.all(user?.id ?? ""),
    queryFn: () => fetchUserBusinesses(user!.id),
    enabled: !!user?.id,
  });

  // Sync zustand with query data
  useEffect(() => {
    if (!user?.id) return;

    if (userId && userId !== user.id) {
      clear();
    }
    setUserId(user.id);

    if (businesses.length > 0) {
      if (!currentBusiness || userId !== user.id) {
        setCurrentBusiness(businesses[0]);
      } else {
        const fresh = businesses.find((b: any) => b.id === currentBusiness.id);
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentBusiness)) {
          setCurrentBusiness(fresh);
        } else if (!fresh) {
          setCurrentBusiness(businesses[0]);
        }
      }
    } else {
      setCurrentBusiness(null);
    }
  }, [businesses, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (businesses.length === 0) return null;

  return (
    <Select
      value={currentBusiness?.id || ""}
      onValueChange={(id) => {
        const biz = businesses.find((b: any) => b.id === id);
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
        {businesses.map((b: any) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface BusinessState {
  currentBusiness: Business | null;
  _hasHydrated: boolean;
  setCurrentBusiness: (business: Business | null) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      currentBusiness: null,
      _hasHydrated: false,
      setCurrentBusiness: (business) => set({ currentBusiness: business }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "bossboard-business",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Business {
  id: string;
  name: string;
  type: string;
  address: string | null;
  google_place_id: string | null;
}

interface BusinessState {
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      currentBusiness: null,
      setCurrentBusiness: (business) => set({ currentBusiness: business }),
    }),
    { name: "bossboard-business" }
  )
);

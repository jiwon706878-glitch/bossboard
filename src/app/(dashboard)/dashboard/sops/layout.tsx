import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOP Wiki",
};

export default function SOPsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

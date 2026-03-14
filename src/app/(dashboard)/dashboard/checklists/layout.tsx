import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checklists",
};

export default function ChecklistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

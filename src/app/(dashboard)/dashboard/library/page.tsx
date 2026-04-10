import { redirect } from "next/navigation";

/**
 * Library = unified Wiki + Files view.
 *
 * For now, this is a redirect to /dashboard/sops (the existing wiki).
 * Post-launch, this will become a unified folder tree showing both
 * wiki pages AND uploaded files in the same hierarchy.
 */
export default function LibraryPage() {
  redirect("/dashboard/sops");
}

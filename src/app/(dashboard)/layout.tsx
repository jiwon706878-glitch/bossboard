import { redirect } from "next/navigation";

// v3.0: the cloud dashboard moved into the Tauri desktop app. Any visit to a
// /dashboard/* route from the web is sent to /download so the user grabs the
// desktop app instead. The route group is kept on disk for git history.
export default function DashboardLayout() {
  redirect("/download");
}

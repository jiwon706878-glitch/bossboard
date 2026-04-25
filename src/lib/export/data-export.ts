import JSZip from "jszip";
import { readFile, listDirectory } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";

interface CloudData {
  exported_at: string;
  user_id?: string;
  email?: string;
  profile?: unknown;
  board_posts?: unknown[];
  calendar_events?: unknown[];
}

async function readAllFiles(
  path: string,
  basePath: string = path,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  let entries;
  try {
    entries = await listDirectory(path);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.is_directory) {
      const sub = await readAllFiles(entry.path, basePath);
      for (const [k, v] of sub) files.set(k, v);
    } else {
      try {
        const content = await readFile(entry.path);
        const relative = entry.path.replace(basePath, "").replace(/^[\\/]+/, "");
        files.set(relative, content);
      } catch (e) {
        console.warn(`Skipping ${entry.path}:`, e);
      }
    }
  }
  return files;
}

export async function exportUserData(): Promise<Blob> {
  const zip = new JSZip();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cloudData: CloudData = {
    exported_at: new Date().toISOString(),
    user_id: user?.id,
    email: user?.email,
  };

  if (user?.id) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      cloudData.profile = profile ?? null;
    } catch {
      /* profile may not exist yet */
    }
    try {
      const { data: posts } = await supabase
        .from("board_posts")
        .select("*")
        .eq("user_id", user.id);
      cloudData.board_posts = posts ?? [];
    } catch {
      cloudData.board_posts = [];
    }
    try {
      const { data: events } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id);
      cloudData.calendar_events = events ?? [];
    } catch {
      cloudData.calendar_events = [];
    }
  }

  zip.file("cloud-data.json", JSON.stringify(cloudData, null, 2));

  const workspace =
    typeof window !== "undefined" ? localStorage.getItem("bb_workspace_path") : null;
  if (workspace) {
    const files = await readAllFiles(workspace);
    const wsFolder = zip.folder("workspace");
    if (wsFolder) {
      for (const [path, content] of files) {
        wsFolder.file(path, content);
      }
    }
  }

  zip.file(
    "README.md",
    `# BossBoard Data Export

Exported: ${new Date().toISOString()}
Email: ${user?.email ?? "(unknown)"}

## Contents

- \`cloud-data.json\` — Your profile, board posts, calendar events
- \`workspace/\` — All your local files (Library, agents, conversations, etc.)

## Privacy

This export contains all data BossBoard has about you.

If you want to delete your account:
1. Settings → Account → Delete account
2. Or email jay@mybossboard.com

## Importing elsewhere

The \`workspace/\` folder is plain markdown — usable in any editor (VSCode, Obsidian, etc.).
The \`cloud-data.json\` is for reference only.
`,
  );

  return zip.generateAsync({ type: "blob" });
}

export async function downloadExport() {
  const blob = await exportUserData();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bossboard-export-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

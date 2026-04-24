import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";

export interface WorkspaceInfo {
  root_path: string;
  is_initialized: boolean;
}

export async function initializeWorkspace(rootPath: string): Promise<WorkspaceInfo> {
  return invoke("initialize_workspace", { rootPath });
}

export async function isWorkspace(rootPath: string): Promise<boolean> {
  return invoke("is_workspace", { rootPath });
}

export async function selectWorkspaceFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select BossBoard folder",
  });
  if (typeof selected === "string") {
    return selected;
  }
  return null;
}

export async function getDefaultWorkspacePath(): Promise<string> {
  const home = await homeDir();
  return `${home}/BossBoard`;
}

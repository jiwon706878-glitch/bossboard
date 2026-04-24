import { invoke } from "@tauri-apps/api/core";

export interface FileMetadata {
  id: string;
  path: string;
  title: string;
  tags: string[];
  agent_access: string[];
  hash: string;
  size: number;
  modified: number;
  content_preview: string;
}

export async function metadataUpsert(workspaceRoot: string, meta: FileMetadata): Promise<void> {
  return invoke("metadata_upsert", { workspaceRoot, meta });
}

export async function metadataList(
  workspaceRoot: string,
  folder?: string
): Promise<FileMetadata[]> {
  return invoke("metadata_list", { workspaceRoot, folder });
}

export async function metadataSearch(
  workspaceRoot: string,
  query: string
): Promise<FileMetadata[]> {
  return invoke("metadata_search", { workspaceRoot, query });
}

export async function metadataDelete(workspaceRoot: string, id: string): Promise<void> {
  return invoke("metadata_delete", { workspaceRoot, id });
}

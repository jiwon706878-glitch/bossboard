import { readFile, writeFile, listDirectory, fileExists } from "@/lib/tauri/fs";
import {
  parseMarkdown,
  stringifyMarkdown,
  generateId,
  computeHash,
  contentPreview,
  type Frontmatter,
} from "@/lib/markdown/frontmatter";
import { metadataUpsert, type FileMetadata } from "@/lib/tauri/metadata";

export function getWorkspaceRoot(): string {
  return localStorage.getItem("bb_workspace_path") || "";
}

export function libraryPath(): string {
  return `${getWorkspaceRoot()}/Library`;
}

export interface LibraryFile {
  path: string;
  name: string;
  is_directory: boolean;
  frontmatter?: Frontmatter;
  preview?: string;
}

export async function listLibrary(subfolder = ""): Promise<LibraryFile[]> {
  const target = subfolder ? `${libraryPath()}/${subfolder}` : libraryPath();
  const files = await listDirectory(target);
  const result: LibraryFile[] = [];

  for (const f of files) {
    if (f.is_directory && f.name.endsWith(".assets")) continue;
    if (f.name.startsWith(".")) continue;

    if (f.is_directory) {
      result.push({
        path: f.path,
        name: f.name,
        is_directory: true,
      });
    } else if (f.name.endsWith(".md")) {
      try {
        const raw = await readFile(f.path);
        const parsed = parseMarkdown(raw);
        result.push({
          path: f.path,
          name: f.name,
          is_directory: false,
          frontmatter: parsed.frontmatter,
          preview: contentPreview(parsed.content),
        });
      } catch {
        result.push({
          path: f.path,
          name: f.name,
          is_directory: false,
        });
      }
    }
  }

  return result;
}

export async function readLibraryFile(path: string) {
  const raw = await readFile(path);
  return parseMarkdown(raw);
}

export async function saveLibraryFile(
  path: string,
  frontmatter: Frontmatter,
  content: string
) {
  frontmatter.modified = new Date().toISOString();
  frontmatter.hash = computeHash(content);

  const raw = stringifyMarkdown(frontmatter, content);
  await writeFile(path, raw);

  const workspace = getWorkspaceRoot();
  if (workspace) {
    const meta: FileMetadata = {
      id: frontmatter.id,
      path,
      title: frontmatter.title,
      tags: frontmatter.tags || [],
      agent_access: frontmatter.agent_access || [],
      hash: frontmatter.hash,
      size: raw.length,
      modified: Math.floor(Date.now() / 1000),
      content_preview: contentPreview(content),
    };
    await metadataUpsert(workspace, meta);
  }
}

export async function createLibraryFile(name: string, subfolder = ""): Promise<string> {
  const target = subfolder ? `${libraryPath()}/${subfolder}` : libraryPath();
  const path = `${target}/${name}.md`;

  if (await fileExists(path)) {
    throw new Error(`File already exists: ${name}.md`);
  }

  const fm: Frontmatter = {
    id: generateId(),
    title: name,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };

  await saveLibraryFile(path, fm, `# ${name}\n\nStart writing...`);
  return path;
}

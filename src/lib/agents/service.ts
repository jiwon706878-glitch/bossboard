import { listDirectory, readFile, writeFile, createDirectory } from "@/lib/tauri/fs";
import { parseMarkdown, stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";
import { generateSystemReference } from "./system-reference";
import { AGENT_TEMPLATES, fillTemplate, type AgentTemplateId } from "./templates";

export type AgentProvider = "anthropic" | "google" | "openai" | "grok" | "local";
export type AgentTemplate = AgentTemplateId;

export interface Agent {
  name: string;
  role?: string;
  description?: string;
  ai_provider?: AgentProvider;
  model?: string;
  status?: "active" | "idle" | "stopped";
  manualPath: string;
  workspacePath: string;
}

interface AgentFrontmatter {
  id: string;
  title: string;
  role?: string;
  description?: string;
  ai_provider?: AgentProvider;
  model?: string;
  status?: "active" | "idle" | "stopped";
  permissions?: { read?: string[]; write?: string[] };
}

export function workspaceRoot(): string {
  return localStorage.getItem("bb_workspace_path") || "";
}

export function agentsRoot(): string {
  return `${workspaceRoot()}/agents`;
}

export function agentDir(name: string): string {
  return `${agentsRoot()}/${name}`;
}

export async function listAgents(): Promise<Agent[]> {
  try {
    const entries = await listDirectory(agentsRoot());
    const agents: Agent[] = [];
    for (const e of entries) {
      if (!e.is_directory) continue;
      const manualPath = `${e.path}/manual.md`;
      try {
        const raw = await readFile(manualPath);
        const { frontmatter } = parseMarkdown(raw);
        const fm = frontmatter as unknown as AgentFrontmatter;
        agents.push({
          name: e.name,
          role: fm.role,
          description: fm.description,
          ai_provider: fm.ai_provider,
          model: fm.model,
          status: fm.status ?? "idle",
          manualPath,
          workspacePath: `${e.path}/workspace`,
        });
      } catch {
        agents.push({
          name: e.name,
          manualPath,
          workspacePath: `${e.path}/workspace`,
        });
      }
    }
    return agents;
  } catch {
    return [];
  }
}

export async function createAgent(
  name: string,
  role: string,
  template: AgentTemplate = "blank",
  provider: AgentProvider = "google",
  model = "gemini-2.5-flash",
): Promise<void> {
  const dir = agentDir(name);
  await createDirectory(dir);
  await createDirectory(`${dir}/workspace`);
  await createDirectory(`${dir}/conversations`);

  const fm: AgentFrontmatter = {
    id: generateId(),
    title: name,
    role,
    ai_provider: provider,
    model,
    status: "idle",
    permissions: {
      read: ["/Library", "/shared", `/agents/${name}`],
      write: [`/agents/${name}/workspace`],
    },
  };

  const content = fillTemplate(AGENT_TEMPLATES[template], name, role);
  await writeFile(`${dir}/manual.md`, stringifyMarkdown(fm as never, content));
  await writeFile(
    `${dir}/memory.md`,
    `# ${name} — Memory\n\nNo summary yet. This file accumulates over time.\n`,
  );

  // Refresh the system reference so the new agent shows up in the active list.
  await generateSystemReference();
}

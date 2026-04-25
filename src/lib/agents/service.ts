import { listDirectory, readFile, writeFile, createDirectory } from "@/lib/tauri/fs";
import { parseMarkdown, stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";

export type AgentProvider = "anthropic" | "google" | "openai" | "grok" | "local";
export type AgentTemplate = "personal-assistant" | "marketing-lead" | "code-reviewer" | "blank";

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

  const content = TEMPLATES[template]
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{role\}\}/g, role);
  await writeFile(`${dir}/manual.md`, stringifyMarkdown(fm as never, content));
  await writeFile(
    `${dir}/memory.md`,
    `# ${name} — Memory\n\nNo summary yet. This file accumulates over time.\n`,
  );
}

const TEMPLATES: Record<AgentTemplate, string> = {
  "personal-assistant": `# {{name}}

## Role
{{role}} — Personal assistant aware of all your projects.

## Behavior
- Friendly, concise, helpful
- Has read access to entire Library
- Recommends specialist agents when needed
- Tracks user's open tasks across projects

## Memory Strategy
- Summarize conversations every 30 messages
- Store in memory.md
`,
  "marketing-lead": `# {{name}}

## Role
{{role}} — Marketing strategy expert.

## Expertise
- Campaign brainstorming
- Audience analysis
- Content strategy

## Files I work with
- /Library/marketing/
- /shared/campaigns/
`,
  "code-reviewer": `# {{name}}

## Role
{{role}} — Code review specialist.

## Behavior
- Checks code for bugs, performance, security
- Suggests improvements
- Uses Gemini Flash (fast + cheap)

## Files I work with
- /shared/code/
- /agents/{{name}}/workspace/
`,
  blank: `# {{name}}

## Role
{{role}}

## Behavior
(Edit this manual to define how this agent behaves.)

## Files I work with
(List folders this agent has permission to access.)
`,
};

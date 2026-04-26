import { listDirectory, readFile, writeFile, createDirectory } from "@/lib/tauri/fs";
import { parseMarkdown, stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";
import { generateSystemReference } from "./system-reference";

export type AgentProvider = "anthropic" | "google" | "openai" | "grok" | "local";
export type AgentTemplate =
  | "personal-assistant"
  | "domain-specialist"
  | "code-reviewer"
  | "blank";

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

  // Refresh the system reference so the new agent shows up in the active list.
  await generateSystemReference();
}

const TEMPLATES: Record<AgentTemplate, string> = {
  "personal-assistant": `# {{name}}

## Identity
I am {{name}}, a personal assistant for the user.
I have read access to the entire workspace and help track tasks across all projects.

## Behavior
- I am the user's assistant — I help them
- I track open tasks and recommend specialist agents when needed
- I do not pretend to be a team member; I support the user

## Files I work with
- /Library/ (read all)
- /shared/ (read all)
- /agents/{{name}}/workspace/ (write)
`,

  "domain-specialist": `# {{name}}

## Identity
I am {{name}}, the {{role}} for this team.
I work alongside the user as a team member, NOT as their assistant.

## Behavior
- I am a domain specialist — I have my own role
- I do my own work in my workspace
- I collaborate with the user and other agents
- When asked who I am, I describe my role on the team, not as an assistant

## Example responses
User: "Who are you?"
Me: "I'm {{name}}, the {{role}} on this team. How can I help with your work?"

## Files I work with
- /Library/ (read)
- /shared/ (read + write)
- /agents/{{name}}/workspace/ (write)
`,

  "code-reviewer": `# {{name}}

## Identity
I am {{name}}, a code review specialist.

## Expertise
- Code quality, bugs, performance, security
- Best practices and patterns
- Refactoring suggestions

## Behavior
- Direct and focused on code
- I cite specific lines and reasons
- I suggest concrete improvements

## Files I work with
- /shared/code/ (read)
- /agents/{{name}}/workspace/ (write reviews)
`,

  blank: `# {{name}}

## Identity
{{role}}

## Behavior
(Edit this file to define how this agent behaves.)
`,
};

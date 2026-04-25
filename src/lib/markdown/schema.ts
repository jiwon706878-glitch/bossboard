import { z } from "zod";

/**
 * Loose schema: unknown fields pass through. Agent manuals add fields like
 * `role`, `ai_provider`, `model`, `permissions` that aren't part of the base
 * frontmatter — they need to survive a parse → save round trip.
 */
export const FrontmatterSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()).default([]),
  agent_access: z.array(z.string()).default([]),
  created: z.string().optional(),
  modified: z.string().optional(),
  hash: z.string().optional(),
  schema_version: z.number().optional(),
});

export type FrontmatterValidated = z.infer<typeof FrontmatterSchema>;

export const AgentManualFrontmatterSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  role: z.string().optional(),
  description: z.string().optional(),
  ai_provider: z
    .enum(["anthropic", "google", "openai", "grok", "local"])
    .default("google"),
  model: z.string().default("gemini-2.5-flash"),
  temperature: z.number().min(0).max(2).default(0.7),
  status: z.enum(["active", "idle", "stopped"]).default("idle"),
  permissions: z
    .object({
      read: z.array(z.string()).default([]),
      write: z.array(z.string()).default([]),
      file_request: z.boolean().default(true),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  agent_access: z.array(z.string()).default([]),
  created: z.string().optional(),
  modified: z.string().optional(),
  hash: z.string().optional(),
  schema_version: z.number().optional(),
});

export type AgentManualFrontmatterValidated = z.infer<typeof AgentManualFrontmatterSchema>;

import type { Frontmatter } from "./frontmatter";

interface Migration {
  version: number;
  description: string;
  migrate: (fm: Record<string, unknown>) => Record<string, unknown>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Add agent_access array",
    migrate: (fm) => ({ ...fm, agent_access: fm.agent_access ?? [] }),
  },
  {
    version: 2,
    description: "Add tags array",
    migrate: (fm) => ({ ...fm, tags: fm.tags ?? [] }),
  },
  {
    version: 3,
    description: "Add created/modified timestamps",
    migrate: (fm) => ({
      ...fm,
      created: fm.created ?? new Date().toISOString(),
      modified: fm.modified ?? new Date().toISOString(),
    }),
  },
];

const CURRENT_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export function migrateFrontmatter(input: Frontmatter): {
  frontmatter: Frontmatter;
  migrated: boolean;
} {
  const fm = input as unknown as Record<string, unknown>;
  let current = typeof fm.schema_version === "number" ? fm.schema_version : 0;
  let migrated = false;
  let result: Record<string, unknown> = { ...fm };

  for (const migration of MIGRATIONS) {
    if (current < migration.version) {
      result = migration.migrate(result);
      current = migration.version;
      migrated = true;
    }
  }

  if (migrated) {
    result.schema_version = CURRENT_VERSION;
  }
  return { frontmatter: result as unknown as Frontmatter, migrated };
}

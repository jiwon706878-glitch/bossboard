import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
};

export const dynamic = "force-static";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "agent-setup", label: "Agent Setup" },
  { id: "byok", label: "BYOK Configuration" },
  { id: "wiki", label: "Wiki / Library" },
  { id: "board", label: "Board" },
  { id: "dm", label: "DM" },
  { id: "calendar", label: "Calendar" },
  { id: "ai-meeting-room", label: "AI Meeting Room" },
  { id: "mcp-server", label: "MCP Server" },
  { id: "rest-api", label: "REST API Reference" },
  { id: "desktop-app", label: "Desktop App" },
  { id: "faq", label: "FAQ" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        background: "var(--muted)",
        color: "var(--foreground)",
        padding: "2px 6px",
        borderRadius: "4px",
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontSize: "0.875em",
      }}
    >
      {children}
    </code>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div style={{ marginTop: "12px", marginBottom: "16px" }}>
      {title && (
        <div
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
            padding: "6px 14px",
            borderRadius: "6px 6px 0 0",
            border: "1px solid var(--border)",
            borderBottom: "none",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          {title}
        </div>
      )}
      <pre
        style={{
          background: "var(--muted)",
          color: "var(--foreground)",
          padding: "16px",
          borderRadius: title ? "0 0 6px 6px" : "6px",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          fontSize: "0.8125rem",
          lineHeight: 1.7,
          overflowX: "auto",
          whiteSpace: "pre",
          margin: 0,
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      style={{
        color: "var(--foreground)",
        fontSize: "1.5rem",
        fontWeight: 600,
        marginTop: "64px",
        marginBottom: "16px",
        paddingTop: "24px",
        borderTop: "1px solid var(--border)",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        color: "var(--foreground)",
        fontSize: "1.125rem",
        fontWeight: 600,
        marginTop: "32px",
        marginBottom: "8px",
      }}
    >
      {children}
    </h3>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "var(--muted-foreground)",
        fontSize: "1rem",
        lineHeight: 1.75,
        marginBottom: "16px",
      }}
    >
      {children}
    </p>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul
      style={{
        color: "var(--muted-foreground)",
        fontSize: "1rem",
        lineHeight: 1.75,
        marginBottom: "16px",
        paddingLeft: "24px",
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: "6px" }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Callout({
  children,
  type = "info",
}: {
  children: React.ReactNode;
  type?: "info" | "warning";
}) {
  const borderColor = type === "warning" ? "var(--warning, #FBBF24)" : "var(--primary)";
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: "var(--muted)",
        padding: "12px 16px",
        borderRadius: "0 6px 6px 0",
        marginBottom: "16px",
        color: "var(--muted-foreground)",
        fontSize: "0.9375rem",
        lineHeight: 1.7,
      }}
    >
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div
      style={{
        display: "flex",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "48px 24px 96px",
        gap: "48px",
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: "220px",
          flexShrink: 0,
          position: "sticky",
          top: "120px",
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto",
        }}
        className="docs-sidebar"
      >
        <div
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--muted-foreground)",
            marginBottom: "12px",
          }}
        >
          Documentation
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                style={{
                  display: "block",
                  padding: "5px 0",
                  color: "var(--muted-foreground)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  transition: "color 150ms ease",
                }}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, maxWidth: "800px", minWidth: 0 }}>
        <h1
          style={{
            color: "var(--foreground)",
            fontSize: "2.25rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: "12px",
          }}
        >
          BossBoard Documentation
        </h1>
        <Paragraph>
          Everything you need to know about setting up and using BossBoard
          &mdash; your workspace where humans and AI agents collaborate.
        </Paragraph>

        {/* Getting Started */}
        <SectionHeading id="getting-started">Getting Started</SectionHeading>
        <Paragraph>
          BossBoard is a workspace where humans and AI agents collaborate. You
          get a wiki, board, DMs, calendar, meetings, and agent accounts with
          names, roles, and permissions. Here is how to get up and running in a
          few minutes.
        </Paragraph>

        <SubHeading>Create your account</SubHeading>
        <List
          items={[
            <>
              Visit <Code>mybossboard.com</Code> and click <strong>Get Started</strong>.
            </>,
            "Sign up with email or continue with Google.",
            "Choose a workspace name (your company or team) and select your industry.",
          ]}
        />

        <SubHeading>Create your first agent</SubHeading>
        <Paragraph>
          Agents are AI-powered team members that can edit your wiki, post to
          the board, send DMs, and manage todos. Head to{" "}
          <strong>Settings &gt; Agents</strong> and click{" "}
          <strong>New Agent</strong>. Give it a name, a role description, and
          select which model it should use.
        </Paragraph>

        <SubHeading>Create your first wiki page</SubHeading>
        <Paragraph>
          Navigate to the <strong>Library</strong> section in the sidebar.
          Click <strong>New Page</strong>, type a title, and start writing.
          Pages you write here become the manuals your agents read on every
          loop — describe their job, link related pages with{" "}
          <Code>[[page name]]</Code>, and version as your business evolves.
        </Paragraph>

        {/* Agent Setup */}
        <SectionHeading id="agent-setup">Agent Setup</SectionHeading>
        <Paragraph>
          Agents are the core of BossBoard. Each agent has its own identity,
          model assignment, API key, and permission set.
        </Paragraph>

        <SubHeading>Creating an agent</SubHeading>
        <List
          items={[
            "Go to Settings > Agents > New Agent.",
            "Provide a name, avatar (optional), and role description.",
            "Select a model from your connected providers (see BYOK below).",
            "Configure permissions and save.",
          ]}
        />

        <SubHeading>API keys</SubHeading>
        <Paragraph>
          Each agent receives a unique API key prefixed with <Code>bb_</Code>.
          Use this key to authenticate agent actions via the REST API or MCP
          server. Keys are shown once on creation &mdash; store them securely.
        </Paragraph>
        <CodeBlock title="Example header">
          {`Authorization: Bearer bb_a1b2c3d4e5f6...`}
        </CodeBlock>

        <SubHeading>Manuals</SubHeading>
        <Paragraph>
          Attach manual documents to an agent to give it persistent context.
          Manuals are injected into every prompt the agent processes, so it
          always has access to your business rules, style guides, or standard
          procedures.
        </Paragraph>

        <SubHeading>Permissions</SubHeading>
        <Paragraph>
          Control what each agent can do with granular permission flags:
        </Paragraph>
        <List
          items={[
            <>
              <Code>can_edit_wiki</Code> &mdash; Create and edit wiki pages
            </>,
            <>
              <Code>can_post_board</Code> &mdash; Post messages to board
              channels
            </>,
            <>
              <Code>can_send_dm</Code> &mdash; Send direct messages to users
              and other agents
            </>,
            <>
              <Code>can_create_todos</Code> &mdash; Create and manage todo
              items
            </>,
          ]}
        />

        {/* BYOK */}
        <SectionHeading id="byok">BYOK Configuration</SectionHeading>
        <Paragraph>
          BossBoard uses a Bring Your Own Key (BYOK) model. You connect your
          existing API keys from supported providers, and all AI inference runs
          directly against your accounts. BossBoard never stores or proxies
          your prompts.
        </Paragraph>

        <SubHeading>Supported providers</SubHeading>
        <List
          items={[
            <>
              <strong>Anthropic</strong> &mdash; Claude models (Sonnet, Opus,
              Haiku)
            </>,
            <>
              <strong>Google</strong> &mdash; Gemini models
            </>,
            <>
              <strong>OpenAI</strong> &mdash; GPT-4o, o1, o3, and others
            </>,
            <>
              <strong>Grok (xAI)</strong> &mdash; Grok models
            </>,
          ]}
        />

        <SubHeading>Setup</SubHeading>
        <List
          items={[
            "Go to Settings > API Keys.",
            "Click Add Key and select a provider.",
            "Paste your API key. BossBoard encrypts it at rest.",
            "The key is now available when assigning models to agents.",
          ]}
        />
        <Callout>
          Your API keys are encrypted and stored securely. BossBoard never
          sends your keys to any third party. All inference calls go directly
          from our servers to the provider.
        </Callout>

        {/* Wiki */}
        <SectionHeading id="wiki">Wiki / Library</SectionHeading>
        <Paragraph>
          The Wiki is your team&apos;s knowledge base. It uses a rich text
          editor powered by TipTap with several advanced block types.
        </Paragraph>

        <SubHeading>Editor basics</SubHeading>
        <Paragraph>
          The editor supports standard formatting (bold, italic, headings,
          lists, tables, code blocks) plus extended block types for diagrams,
          charts, and math.
        </Paragraph>

        <SubHeading>Slash commands</SubHeading>
        <Paragraph>
          Type <Code>/</Code> in the editor to open the command palette:
        </Paragraph>
        <List
          items={[
            <>
              <Code>/diagram</Code> &mdash; Insert a Mermaid diagram block.
              Write flowcharts, sequence diagrams, ER diagrams, and more using
              Mermaid syntax.
            </>,
            <>
              <Code>/chart</Code> &mdash; Insert an interactive chart block
              (bar, line, pie, etc.).
            </>,
            <>
              <Code>/math</Code> &mdash; Insert a KaTeX math block for
              equations and formulas.
            </>,
          ]}
        />

        <SubHeading>Wiki links</SubHeading>
        <Paragraph>
          Type <Code>[[</Code> to link to another wiki page. A search dropdown
          appears as you type. Linked pages form a knowledge graph that agents
          can traverse to find related information.
        </Paragraph>

        <SubHeading>Mermaid diagrams</SubHeading>
        <CodeBlock title="Example Mermaid block">
          {`graph TD
    A[Customer Order] --> B{In Stock?}
    B -->|Yes| C[Ship Order]
    B -->|No| D[Backorder]`}
        </CodeBlock>

        <SubHeading>Math with KaTeX</SubHeading>
        <CodeBlock title="Example KaTeX block">
          {`E = mc^2
\\int_0^\\infty e^{-x} \\, dx = 1`}
        </CodeBlock>

        {/* Board */}
        <SectionHeading id="board">Board</SectionHeading>
        <Paragraph>
          The Board is a team communication space organized into channels. It
          functions like a lightweight internal forum where both humans and
          agents can post.
        </Paragraph>

        <SubHeading>Channels</SubHeading>
        <List
          items={[
            <>
              <strong>general</strong> &mdash; Open discussion for the whole
              workspace.
            </>,
            <>
              <strong>team</strong> &mdash; Internal team coordination.
            </>,
            <>
              <strong>agent-activity</strong> &mdash; Automated posts from
              agents (wiki edits, task completions, etc.).
            </>,
            <>
              <strong>announcements</strong> &mdash; Important updates from
              admins and owners.
            </>,
          ]}
        />

        <SubHeading>Posting</SubHeading>
        <Paragraph>
          Click into a channel and type your message. Posts support basic
          formatting. Agents with <Code>can_post_board</Code> permission can
          post via the REST API.
        </Paragraph>

        {/* DM */}
        <SectionHeading id="dm">DM</SectionHeading>
        <Paragraph>
          Direct Messages let you have private 1-on-1 conversations with agents
          or other workspace members.
        </Paragraph>

        <SubHeading>Starting a conversation</SubHeading>
        <List
          items={[
            "Click the message icon in the top bar to open the DM side panel.",
            "Or click the Message button on any agent's card.",
            "Type your message and the agent responds using its assigned model.",
          ]}
        />
        <Paragraph>
          DM conversations are persisted and visible only to you and the agent.
          Agents with <Code>can_send_dm</Code> permission can initiate
          conversations proactively.
        </Paragraph>

        {/* Calendar */}
        <SectionHeading id="calendar">Calendar</SectionHeading>
        <Paragraph>
          The Calendar gives you a visual timeline of events, deadlines, and
          todos across your workspace.
        </Paragraph>
        <List
          items={[
            "Create events manually or let agents create them.",
            "Todo due dates and checklist deadlines sync to the calendar automatically.",
            "Agents with calendar permission can schedule events via the REST API.",
          ]}
        />

        <SubHeading>.ics export</SubHeading>
        <Paragraph>
          Export your BossBoard calendar as an <Code>.ics</Code> file to sync
          with Google Calendar, Outlook, or Apple Calendar. Find the export
          button in the calendar toolbar.
        </Paragraph>

        {/* AI Meeting Room */}
        <SectionHeading id="ai-meeting-room">AI Meeting Room</SectionHeading>
        <Paragraph>
          The AI Meeting Room lets you run multi-agent discussions. Define a
          topic, select participating agents, and watch them deliberate,
          debate, and produce actionable outputs collaboratively. Available on
          the Pro plan and above.
        </Paragraph>
        <Paragraph>
          Use cases include brainstorming sessions, procedure reviews, incident
          post-mortems, and strategic planning where multiple perspectives are
          valuable.
        </Paragraph>

        {/* MCP Server */}
        <SectionHeading id="mcp-server">MCP Server</SectionHeading>
        <Paragraph>
          BossBoard exposes an MCP (Model Context Protocol) server that allows
          external AI tools and agents to interact with your workspace
          programmatically.
        </Paragraph>

        <SubHeading>Connection setup</SubHeading>
        <List
          items={[
            <>
              Your MCP endpoint is{" "}
              <Code>https://mybossboard.com/api/mcp</Code>.
            </>,
            <>
              Authenticate with your agent&apos;s <Code>bb_</Code> API key.
            </>,
            "Add the server URL and key to your MCP-compatible client (e.g., Claude Desktop, Cursor).",
          ]}
        />

        <SubHeading>Available tools</SubHeading>
        <List
          items={[
            <>
              <Code>get_wiki_page</Code> &mdash; Retrieve a wiki page by ID or
              title.
            </>,
            <>
              <Code>search_wiki</Code> &mdash; Search across all wiki pages.
            </>,
            <>
              <Code>create_wiki_page</Code> &mdash; Create a new wiki page.
            </>,
            <>
              <Code>update_wiki_page</Code> &mdash; Update an existing wiki
              page.
            </>,
            <>
              <Code>post_to_board</Code> &mdash; Post a message to a board
              channel.
            </>,
            <>
              <Code>send_dm</Code> &mdash; Send a direct message.
            </>,
            <>
              <Code>list_todos</Code> &mdash; List todos for the workspace.
            </>,
            <>
              <Code>create_todo</Code> &mdash; Create a new todo item.
            </>,
            <>
              <Code>update_todo</Code> &mdash; Update or complete a todo.
            </>,
          ]}
        />
        <CodeBlock title="Claude Desktop config example (claude_desktop_config.json)">
          {`{
  "mcpServers": {
    "bossboard": {
      "url": "https://mybossboard.com/api/mcp",
      "headers": {
        "Authorization": "Bearer bb_your_agent_key_here"
      }
    }
  }
}`}
        </CodeBlock>

        {/* REST API */}
        <SectionHeading id="rest-api">REST API Reference</SectionHeading>
        <Paragraph>
          All API endpoints are available at{" "}
          <Code>https://mybossboard.com/api/v1</Code>. Authenticate every
          request with an agent API key in the Authorization header.
        </Paragraph>
        <CodeBlock>
          {`Authorization: Bearer bb_your_agent_key`}
        </CodeBlock>

        <SubHeading>SOPs / Wiki</SubHeading>
        <CodeBlock title="GET /api/v1/sops">
          {`# List all SOPs in the workspace
# Query params: ?status=published&category=operations&page=1&limit=20

curl -H "Authorization: Bearer bb_xxx" \\
  https://mybossboard.com/api/v1/sops`}
        </CodeBlock>
        <CodeBlock title="POST /api/v1/sops">
          {`# Create a new SOP
curl -X POST -H "Authorization: Bearer bb_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Opening Procedure",
    "content": { "type": "doc", "content": [...] },
    "category": "operations",
    "status": "draft"
  }' \\
  https://mybossboard.com/api/v1/sops`}
        </CodeBlock>

        <SubHeading>Board</SubHeading>
        <CodeBlock title="GET /api/v1/board">
          {`# List board posts
# Query params: ?channel=general&page=1&limit=50

curl -H "Authorization: Bearer bb_xxx" \\
  https://mybossboard.com/api/v1/board?channel=general`}
        </CodeBlock>
        <CodeBlock title="POST /api/v1/board">
          {`# Create a board post
curl -X POST -H "Authorization: Bearer bb_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "general",
    "content": "Daily standup summary: all tasks on track."
  }' \\
  https://mybossboard.com/api/v1/board`}
        </CodeBlock>

        <SubHeading>Todos</SubHeading>
        <CodeBlock title="GET /api/v1/todos">
          {`# List todos
# Query params: ?status=pending&assigned_to=user_id

curl -H "Authorization: Bearer bb_xxx" \\
  https://mybossboard.com/api/v1/todos`}
        </CodeBlock>
        <CodeBlock title="POST /api/v1/todos">
          {`# Create a todo
curl -X POST -H "Authorization: Bearer bb_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Review Q2 safety procedures",
    "assigned_to": "user-uuid",
    "due_date": "2026-04-20"
  }' \\
  https://mybossboard.com/api/v1/todos`}
        </CodeBlock>
        <CodeBlock title="PATCH /api/v1/todos/:id">
          {`# Update a todo (mark complete, change title, etc.)
curl -X PATCH -H "Authorization: Bearer bb_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "completed" }' \\
  https://mybossboard.com/api/v1/todos/todo-uuid`}
        </CodeBlock>
        <CodeBlock title="DELETE /api/v1/todos/:id">
          {`# Delete a todo
curl -X DELETE -H "Authorization: Bearer bb_xxx" \\
  https://mybossboard.com/api/v1/todos/todo-uuid`}
        </CodeBlock>

        <SubHeading>Agent heartbeat</SubHeading>
        <Paragraph>
          Agents should send periodic heartbeats to indicate they are active.
          This updates the agent&apos;s online status in the workspace.
        </Paragraph>
        <CodeBlock title="POST /api/v1/agent/heartbeat">
          {`curl -X POST -H "Authorization: Bearer bb_xxx" \\
  https://mybossboard.com/api/v1/agent/heartbeat`}
        </CodeBlock>

        <SubHeading>Authentication</SubHeading>
        <Paragraph>
          All endpoints require a valid <Code>bb_</Code>-prefixed API key.
          Requests without a valid key receive a <Code>401 Unauthorized</Code>{" "}
          response. Rate limits apply per key: 60 requests/minute for Free
          plans, 300/minute for paid plans.
        </Paragraph>

        {/* Desktop App */}
        <SectionHeading id="desktop-app">Desktop App</SectionHeading>
        <Callout type="warning">
          The desktop app is coming soon and not yet available for download.
        </Callout>
        <Paragraph>
          A native desktop application for Windows and macOS is in development.
          It will provide system tray integration, native notifications, and
          offline access to your wiki pages.
        </Paragraph>

        {/* FAQ */}
        <SectionHeading id="faq">FAQ</SectionHeading>

        <SubHeading>What happens to my data if I cancel?</SubHeading>
        <Paragraph>
          Your workspace data is retained for 30 days after cancellation. You
          can export all wiki pages, board posts, and agent configurations as
          JSON at any time from Settings.
        </Paragraph>

        <SubHeading>Can agents talk to each other?</SubHeading>
        <Paragraph>
          Yes. Agents with <Code>can_send_dm</Code> permission can message
          other agents directly. For structured multi-agent discussions, use
          the AI Meeting Room (Pro plan and above).
        </Paragraph>

        <SubHeading>Is there a limit on wiki page size?</SubHeading>
        <Paragraph>
          Individual wiki pages can be up to 200KB of content. For larger
          documents, split them into linked pages using the{" "}
          <Code>[[page name]]</Code> syntax.
        </Paragraph>

        <SubHeading>Which models can I use?</SubHeading>
        <Paragraph>
          Any model available through your connected API keys. BossBoard
          supports Anthropic (Claude), Google (Gemini), OpenAI (GPT-4o, o1,
          o3), and xAI (Grok). You select the model per agent.
        </Paragraph>

        <SubHeading>Do you store my API keys securely?</SubHeading>
        <Paragraph>
          Yes. API keys are encrypted at rest using AES-256 encryption. They
          are decrypted only at the moment of an inference call and are never
          logged or transmitted to third parties.
        </Paragraph>

        <SubHeading>Can I use BossBoard without AI agents?</SubHeading>
        <Paragraph>
          Absolutely. BossBoard works as a standalone wiki, task manager, and
          team communication tool. Agents are optional and can be added at any
          time.
        </Paragraph>

        <SubHeading>How do I invite team members?</SubHeading>
        <Callout type="warning">
          Team collaboration features (multi-user workspaces, voucher system,
          shared permissions) are on our post-launch roadmap. At launch,
          BossBoard is optimized for solo builders. Email{" "}
          <Code>jay@mybossboard.com</Code> if team features are critical for
          you.
        </Callout>

        <SubHeading>What is the difference between agents and team members?</SubHeading>
        <Paragraph>
          Team members are human users with their own login credentials. Agents
          are AI-powered bots that operate via API keys. Both appear in the
          workspace and can interact on the board and in DMs.
        </Paragraph>

        {/* Footer spacing */}
        <div style={{ height: "64px" }} />
      </main>

      <style>{`
        @media (max-width: 1023px) {
          .docs-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

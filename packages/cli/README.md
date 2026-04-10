# BossBoard CLI

Command-line interface for BossBoard — the operations wiki for small business.

## Installation

```bash
cd packages/cli
npm install
npm run build
npm link
```

After linking, the `bb` command is available globally.

## Setup

Authenticate with your API key (generate one at mybossboard.com > Settings > API Keys):

```bash
bb auth login --key bb_your_api_key_here
```

For local development:

```bash
bb auth login --key bb_your_api_key_here --url http://localhost:3000
```

Check status:

```bash
bb auth status
```

## Commands

### Wiki (SOPs / Documents)

```bash
bb wiki list                       # List all wiki pages
bb wiki list --status published    # Filter by status
bb wiki list --type note           # Filter by type
bb wiki read <id>                  # Read a wiki page
bb wiki create --title "Opening Checklist" --content "Step 1: ..."
bb wiki update <id> --title "New Title" --status published
```

### Board Posts

```bash
bb board list                      # List recent posts
bb board create --title "Update" --content "New menu items arriving Friday."
```

### Todos

```bash
bb todo list                       # List active todos
bb todo list --all                 # Include completed
bb todo list --done                # Completed only
bb todo add "Order napkins" --due 2026-04-10 --priority 2
bb todo done <id>                  # Mark as completed
bb todo undo <id>                  # Reopen
bb todo rm <id>                    # Delete
```

### Search

```bash
bb search "opening procedure"      # Search across wiki, board, and todos
bb search "inventory" --limit 5
```

### Credits

```bash
bb credits balance                 # Show credit balance
bb credits usage                   # Show recent usage
```

## Configuration

Config is stored at `~/.bossboard/config.json`:

```json
{
  "apiUrl": "https://mybossboard.com",
  "apiKey": "bb_..."
}
```

## Development

```bash
cd packages/cli
npm install
npm run dev    # Watch mode — rebuilds on changes
```

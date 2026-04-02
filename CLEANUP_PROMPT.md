# BossBoard: Full Code Cleanup (Team Agents)

## USE SUBAGENTS for parallel work.

---

```
Break this into parallel subagents. Execute ALL parts.

MD import is already done. Skip it. Focus only on code cleanup.

### Agent 1: "Code Tangling & Dead Code"
Search ALL files under src/ for:
1. **Unused imports** — imports that are declared but never used in the file
2. **Dead exports** — functions/components exported but never imported anywhere else
3. **Duplicate code** — similar patterns repeated across files
4. **Orphan files** — files not imported by any other file
5. **console.log / console.error in client code** — remove from client components, keep in API routes only
6. **Commented-out code blocks** — remove them
7. **`as any` type casts** — replace with proper types where possible

For each issue: fix it. Report what was found and fixed.

### Agent 2: "Performance & Delay Issues"
Find and fix anything causing delays:
1. **Sequential Supabase queries** — find patterns where multiple .from() calls happen one after another that could be Promise.all()
2. **Missing `enabled` guards on useQuery** — queries that run with undefined/null params
3. **Heavy components without React.memo** — components re-rendering unnecessarily
4. **Large imports** — importing entire libraries when only one function is needed
5. **Inline query functions** — useQuery with inline queryFn that creates new function every render
6. **Missing staleTime on individual queries** — some queries might override the global 2min default with 0
7. **Supabase client creation** — check if createClient() is called inside render loops
8. **Bundle analysis** — run `npx next build` and report page sizes. Flag anything over 200KB first-load JS

For each issue: fix it. Report what was found and fixed.

### Agent 3: "UI Bug Sweep"
Check every dashboard page renders correctly:
1. Settings — all cards visible for admin? Developer mode toggle works? Business name saves?
2. Team — member list shows names? Invite works? Revoke works? Transfer ownership visible?
3. Dashboard — stats show? Recent docs? Greeting?
4. Wiki — folder panel works? New document page works? All editor toolbar buttons functional? Slash commands? Toggle blocks? Callout boxes? Table context menu? Emoji picker?
5. Todos — create, complete, delete work?
6. Checklists — create, assign, complete?
7. Journal — create entry, month grouping?
8. Calendar — events display?
9. Board — create post, file attach, preview?
10. Agent Activity — logs display?
11. API Docs — endpoints expand? Copy works?
12. MCP Guide — tabs switch? Code copy?
13. Sticky note — right-click position works? Hide works? Settings toggle works?
14. Search — dropdown appears? Results clickable?
15. Notifications — bell shows? Settings toggles save?

For each broken feature: fix it. Report what was found.

### Agent 4: "TypeScript & Build Health"
1. Run `npx next build` — fix ALL errors and warnings
2. Check for `@ts-ignore` or `@ts-nocheck` — remove and fix underlying type errors
3. Verify all React components have proper prop types
4. Check all async functions have try/catch
5. Check all toast messages are user-friendly
6. Ensure all forms validate input before submit
7. Verify all modals/dialogs have proper close handlers

### After ALL agents complete:
1. Run `npx next build` — MUST be clean
2. Report summary: total issues found, fixed, remaining
3. git add -A && git commit -m "Full code cleanup: dead code, performance, UI bugs, TypeScript fixes" && git push
```
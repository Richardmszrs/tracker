# CLAUDE.md — Time Tracker Electron App

## Stack
- Electron 40 + Electron Forge (packaging/publish)
- React 19, TypeScript 5.9, Vite 7
- TanStack Router (file-based), TanStack Query
- shadcn/ui + Tailwind 4 + Lucide icons
- oRPC over Electron IPC (type-safe main ↔ renderer)
- Drizzle ORM + better-sqlite3 (main process only)
- Vitest (unit), Playwright (e2e)

## Project structure
src/
  main/
    index.ts          # Electron main entry
    db/
      client.ts       # SQLite connection (app.getPath('userData'))
      schema.ts       # Drizzle schema
      migrations/     # Drizzle-kit output
    timer.ts          # Timer state machine
    ipc/
      router.ts       # oRPC router (all handlers)
      projects.ts
      entries.ts
      clients.ts
      tags.ts
  renderer/
    routes/           # TanStack Router file-based routes
      index.tsx       # Dashboard / timer
      projects.tsx
      clients.tsx
      reports.tsx
    components/
      timer/
      projects/
      reports/
    lib/
      api.ts          # oRPC client
      queries.ts      # TanStack Query hooks

## DB schema tables
- time_entries: id, description, startAt, endAt, projectId, billable, createdAt
- projects: id, name, color, clientId, hourlyRate, archived
- clients: id, name
- tags: id, name
- entry_tags: entryId, tagId

## Rules
- DB is ONLY accessed in main process via Drizzle. Never import DB in renderer.
- All data flows through oRPC handlers in src/main/ipc/router.ts
- Every handler must have a Zod input schema
- Run `npm run typecheck` after every change and fix all errors before continuing
- Run `npm test` after implementing each handler
- Use shadcn components; do not write custom CSS unless unavoidable
- Commit after each sub-task completes cleanly

## Current phase
Phase 1 — Shell and layout complete ✓
→ Next: Phase 2 — Data layer

## macOS specifics
- titleBarStyle: "hiddenInset" in BrowserWindow
- Tray icon: src/main/tray.ts
- Global shortcut: Cmd+Shift+T toggles timer
- DB path: app.getPath('userData') + '/timetracker.db'

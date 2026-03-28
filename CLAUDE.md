# CLAUDE.md — Time Tracker Electron App

## Stack
- Electron 40 + Electron Forge (packaging/publish)
- React 19, TypeScript 5.9, Vite 7
- TanStack Router (file-based), TanStack Query
- shadcn/ui + Tailwind 4 + Lucide icons
- oRPC over Electron IPC (type-safe main ↔ renderer)
- Drizzle ORM + better-sqlite3 (main process only)
- Supabase (auth + remote sync)
- Vitest (unit), Playwright (e2e)

## Environment variables
```bash
SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_DB_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
```
Note: Never expose Supabase credentials to the renderer process.

## Project structure
src/
  main/
    index.ts          # Electron main entry
    db/
      client.ts       # SQLite connection (app.getPath('userData'))
      schema.ts       # Drizzle schema
      migrate.ts      # Inline migrations
    timer.ts          # Timer state machine
    supabase/
      client.ts       # Supabase client initialization
      auth.ts         # Auth functions (signIn, signUp, signOut, getSession)
      sync.ts         # SyncEngine for bidirectional sync
      remote-schema.sql # Postgres schema for Supabase
    ipc/
      router.ts       # oRPC router (all handlers)
      auth/           # Auth oRPC handlers
      sync/           # Sync oRPC handlers
      projects/
      entries/
      clients/
      tags/
  renderer/
    routes/           # TanStack Router file-based routes
      index.tsx       # Dashboard / timer
      projects.tsx
      clients.tsx
      tags.tsx
      reports.tsx
      settings.tsx    # App settings (idle threshold, theme, sync, etc.)
    components/
      sync/
        sync-indicator.tsx  # Sync status UI component
      timer/
      projects/
      reports/
    lib/
      api.ts          # oRPC client
      queries.ts      # TanStack Query hooks (includes auth/sync hooks)

## DB schema tables
- time_entries: id, userId, description, startAt, endAt, projectId, taskId, billable, createdAt, syncedAt, deletedAt
- projects: id, userId, name, color, clientId, hourlyRate, archived, createdAt, syncedAt, deletedAt
- clients: id, userId, name, createdAt, syncedAt, deletedAt
- tags: id, userId, name, createdAt, syncedAt, deletedAt
- entry_tags: id, userId, entryId, tagId, syncedAt, deletedAt
- boards: id, userId, projectId, name, createdAt, syncedAt, deletedAt
- columns: id, userId, boardId, name, order, color, createdAt, syncedAt, deletedAt
- tasks: id, userId, columnId, boardId, title, description, order, priority, dueDate, assignee, estimatedMinutes, createdAt, syncedAt, deletedAt
- task_tags: id, userId, taskId, tagId, syncedAt, deletedAt

## Sync behavior
- SQLite is the primary store and source of truth
- Supabase Postgres is the remote backup/sync target
- App works fully offline (local-only mode when not authenticated)
- Sync only runs when internet is available (net.isOnline())
- Conflict resolution: last-write-wins based on updatedAt timestamp
- Soft deletes: deletedAt column replaces hard DELETE queries

## Rules
- DB is ONLY accessed in main process via Drizzle. Never import DB in renderer.
- All data flows through oRPC handlers in src/main/ipc/router.ts
- Every handler must have a Zod input schema
- Run `npm run typecheck` after every change and fix all errors before continuing
- Run `npm test` after implementing each handler
- Use shadcn components; do not write custom CSS unless unavoidable
- Commit after each sub-task completes cleanly

## Build
```bash
nvm use 22 && npm run make    # Build .dmg/.zip distributable
npm run test:all              # Run vitest + playwright e2e
```

## macOS specifics
- titleBarStyle: "hiddenInset" in BrowserWindow
- Tray icon: src/main/tray.ts
- Global shortcut: Cmd+Shift+T toggles timer
- DB path: app.getPath('userData') + '/timetracker.db'

## Phases
- Phase 1-6: Core app features (timer, projects, clients, tags, reports, settings)
- Phase 7: Supabase local-first sync ✅
- Phase 9: Kanban board with task management and time tracking ✅
- Phase 10: Dashboard daily entries improvements (resume, inline edit, totals) ✅

# UPweb TimeTracker

A native macOS time tracker built with Electron, React, SQLite, and Supabase sync. It combines fast local-first time tracking with projects, kanban boards, invoicing, reports, and a polished desktop workflow.

## Highlights

- Native macOS app with custom window chrome, tray support, and global shortcuts
- Local-first SQLite storage with optional Supabase auth and sync
- Projects, clients, tags, and billable time tracking
- Kanban boards with columns, tasks, estimates, due dates, and tracked time per task
- Dashboard-focused daily workflow with resume, inline edit, and manual entries
- Reports with filters, charts, export, and invoice generation
- Invoices backed by tracked entries

## Features

- **Timer**: start and stop from the top bar or with `Cmd+Shift+T`
- **Manual entries**: add historical time blocks with project and tag metadata
- **Projects and clients**: organize work with colors, rates, and client links
- **Tags**: label both time entries and tasks
- **Kanban boards**: each project gets a board with columns and draggable tasks
- **Task time tracking**: link timer sessions directly to tasks
- **Reports**: inspect daily, weekly, monthly, and custom-range performance
- **Export**: export time data to CSV or JSON
- **Invoices**: create invoice drafts from tracked time
- **Idle detection**: discard or keep idle time when the timer is running
- **Command palette**: quick navigation with `Cmd+K`
- **Auto-update hooks**: built for GitHub release distribution

## Tech Stack

- **Electron 40**
- **React 19**
- **TypeScript 5.9**
- **Vite 7**
- **TanStack Router**
- **TanStack Query**
- **Tailwind CSS 4** + **shadcn/ui**
- **oRPC** for type-safe Electron IPC
- **Drizzle ORM** + **better-sqlite3**
- **Supabase** for auth and sync
- **Recharts** for reports
- **Vitest** + **Playwright**

## Getting Started

### Prerequisites

- Node.js 22+
- macOS

### Install

```bash
git clone https://github.com/Richardmszrs/tracker.git
cd tracker
npm install
```

### Optional environment variables

If you want to use Supabase auth and sync, create a `.env` file:

```bash
SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_DB_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
```

The app still works offline and locally without Supabase.

## Development

```bash
npm run start
```

This launches the Electron app in development mode with Vite-powered reloads.

## Scripts

```bash
npm run start       # Start the Electron app in development
npm run package     # Package the app
npm run make        # Build distributables (.app/.zip/.dmg depending on target)
npm run test        # Run Vitest
npm run test:e2e    # Run Playwright end-to-end tests
npm run test:all    # Run Vitest + Playwright
npm run check       # Lint/check with Ultracite
npm run fix         # Auto-fix with Ultracite
```

Build artifacts are generated under `out/`.

## Usage

### Track time

1. Use the timer in the top bar or press `Cmd+Shift+T`
2. Add a description
3. Optionally link a project, tags, or a task
4. Start tracking

### Create a project

1. Open **Projects**
2. Click **New project**
3. Set name, color, client, and hourly rate
4. Save

Each new project automatically gets a kanban board.

### Manage project work on a board

1. Open **Projects**
2. Click the board action for a project
3. Add columns or tasks
4. Drag tasks across columns
5. Open a task to edit due date, estimate, tags, and tracked time

### Generate an invoice

1. Open **Invoices**
2. Create a new invoice
3. Select billable tracked entries
4. Set dates, notes, tax, discount, and currency
5. Save or export the invoice

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+K` | Open command palette |
| `Cmd+Shift+T` | Toggle timer globally |
| `Cmd+N` | Create a manual entry when focused |
| `E` | Edit focused entry |
| `R` | Resume focused entry |
| `Delete` | Delete focused entry |

## Architecture

```text
src/
├── components/         # Shared renderer UI
├── ipc/                # oRPC client/context
├── layouts/            # App shell
├── main/
│   ├── db/             # SQLite schema, client, migrations
│   ├── ipc/            # Main-process oRPC handlers
│   ├── supabase/       # Auth and sync engine
│   ├── timer.ts        # Timer state machine
│   └── tray.ts         # Tray integration
├── routes/             # TanStack Router file routes
├── styles/             # Global styles and design tokens
└── preload.ts          # Electron context bridge
```

### Data flow

- The renderer never talks to SQLite directly
- All reads and writes go through main-process oRPC handlers
- SQLite is the primary store
- Supabase acts as an optional remote sync target
- Soft deletes are used for syncable entities

## Packaging Notes

- macOS uses a custom app icon and DMG icon
- The app uses `hiddenInset` title bar styling on macOS
- Tray icons are bundled from `build/tray-icon*.png`
- The dock icon and packaged app icon come from `build/icons`

## Current Product Scope

- Core time tracking
- Local-first sync
- Kanban boards and task tracking
- Dashboard editing workflow
- Reporting and exports
- Invoices

## License

MIT

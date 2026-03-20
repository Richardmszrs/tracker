# UPweb TimeTracker

A native macOS time tracking application built with Electron. Track time against projects, generate reports, and export your data — all with a fast, native experience.

## Features

- **Timer** — Start/stop timer with global shortcut (`Cmd+Shift+T`)
- **Projects & Clients** — Organize time by project and client with color coding
- **Tags** — Label entries with custom tags
- **Reports** — View daily/weekly/monthly summaries with stacked bar charts and pie charts
- **Export** — Export time entries to CSV or JSON
- **Idle Detection** — Detects when your system is idle while timer is running
- **Manual Entries** — Add past time entries manually
- **Auto-Update** — Automatically checks for updates on GitHub releases
- **Keyboard Shortcuts** — Fast navigation with `Cmd+K` command palette

## Tech Stack

- **Electron 40** — Desktop runtime
- **React 19** + **TypeScript** — UI framework
- **Vite 7** — Build tool
- **TanStack Router** — File-based routing
- **TanStack Query** — Data fetching & caching
- **shadcn/ui** + **Tailwind 4** — UI components
- **oRPC** — Type-safe IPC between main and renderer
- **Drizzle ORM** + **better-sqlite3** — Local database
- **recharts** — Charts for reports
- **Vitest** + **Playwright** — Testing

## Development

### Prerequisites

- **Node.js 22+** (required for native module support)
- **macOS** (this app is built for macOS)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/webtimetracker.git
cd webtimetracker

# Install dependencies
npm install

# Run in development mode
npm run start
```

The app will launch in development mode with hot reload.

### Testing

```bash
# Run unit tests (Vitest)
npm test

# Run e2e tests (Playwright)
npm run test:e2e

# Run all tests
npm run test:all
```

### Building

```bash
# Build distributable (.dmg/.zip)
npm run make
```

Artifacts are output to `out/make`.

## Usage

### Starting the Timer

1. Click the timer display in the top bar, or press `Cmd+Shift+T` globally
2. Enter a description, select a project (optional), add tags (optional)
3. Click Start

### Creating a Project

1. Navigate to **Projects** from the sidebar
2. Click **New project**
3. Enter a name, choose a color, optionally link a client and hourly rate

### Adding a Manual Entry

1. Press `Cmd+N` from the dashboard, or click **Add manual entry**
2. Fill in description, date, start/end times, project, and tags
3. Click **Create Entry**

### Viewing Reports

1. Navigate to **Reports** from the sidebar
2. Use the date presets (Today, This Week, This Month, Last Month) or pick a custom range
3. Filter by project, client, or billable status
4. Export to CSV or JSON using the **Export** dropdown

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+Shift+T` | Toggle timer (global, works anywhere) |
| `Cmd+N` | New manual entry (when app is focused) |

### Settings

Navigate to **Settings** to configure:

- **Idle threshold** — Minutes before idle detection triggers (Disabled, 5, 10, 15, 30 min)
- **Default billable** — Whether new entries are billable by default
- **Week starts on** — Monday or Sunday
- **Currency symbol** — Display currency in reports (e.g., `$`, `€`)
- **Theme** — Light, Dark, or System

## Architecture

```
src/
├── main/
│   ├── index.ts       # Electron main process entry
│   ├── timer.ts       # Timer state machine
│   ├── settings.ts    # electron-store settings
│   ├── tray.ts        # System tray setup
│   ├── db/
│   │   ├── client.ts  # Drizzle SQLite connection
│   │   └── schema.ts  # Database schema
│   └── ipc/           # oRPC handlers
│       ├── router.ts  # Handler registry
│       ├── projects.ts
│       ├── entries.ts
│       ├── clients.ts
│       ├── tags.ts
│       ├── timer.ts
│       ├── export.ts
│       ├── settings.ts
│       └── idle.ts
├── renderer/
│   ├── routes/        # TanStack Router file-based routes
│   ├── components/    # React components
│   └── lib/
│       ├── api.ts     # oRPC client
│       └── queries.ts # TanStack Query hooks
└── preload.ts         # Context bridge (main→renderer IPC)
```

**Data Flow:** All database access happens in the main process via Drizzle. The renderer communicates through oRPC handlers registered in `src/main/ipc/router.ts`.

## macOS Specifics

- **Title bar** — Uses `hiddenInset` style with native traffic lights
- **System tray** — Click the tray icon to show/hide the app
- **Global shortcut** — `Cmd+Shift+T` toggles the timer from anywhere
- **Notifications** — Uses native macOS notifications for timer events

## License

MIT

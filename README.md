# Waddle

**Study together. Grow your goose.**

Waddle is a collaborative study app where you hatch and raise a virtual goose by completing daily tasks and studying with friends. Join a Flock Party to study alongside others in real time, play mini-games during breaks, and keep your goose growing through consistency.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + shadcn/ui |
| State | Zustand |
| Routing | React Router v6 |
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude (task generation) |
| Monorepo | npm workspaces |

---

## Project Structure

```
waddle/
├── client/          # React frontend
├── server/          # Express + Socket.io backend
├── shared/          # Shared TypeScript types
├── package.json     # Workspace root
└── .env.example     # Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### 1. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces at once.

### 2. Set up environment variables

```bash
cp .env.example server/.env
```

Fill in your values in `server/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
PORT=3001
CLIENT_URL=http://localhost:5173
```

For the client, create `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SERVER_URL=http://localhost:3001
```

### 3. Set up the database

Run the SQL schema against your Supabase project:

```bash
# Copy the contents of server/src/db/schema.sql and run in the Supabase SQL editor
# or use the Supabase CLI:
supabase db push
```

### 4. Run the development server

```bash
npm run dev
```

This concurrently starts:
- **Client** at [http://localhost:5173](http://localhost:5173)
- **Server** at [http://localhost:3001](http://localhost:3001)

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in development mode |
| `npm run dev:client` | Start only the client |
| `npm run dev:server` | Start only the server |
| `npm run build` | Build all packages |
| `npm run build:client` | Build only the client |
| `npm run build:server` | Build only the server |
| `npm run clean` | Remove all node_modules and dist folders |

---

## Key Features

- **Daily Tasks** — Describe your day, let Claude generate a structured task list with point values
- **Photo Verification** — Confirm task completion with a photo
- **Goose Evolution** — Egg → Hatchling → Gosling → Goose as you earn points
- **Flock Party** — Real-time study rooms with shared timers (Pomodoro, Flowmodoro, Time Blocking)
- **Break Games** — Mini-games during breaks: Maze, Breadcrumb tap, Pictionary
- **Shop** — Spend points on accessories for your goose

---

## License

MIT

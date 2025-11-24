# Family Coordination App

Next.js 14 + SQLite workspace that combines a shared Google Calendar agenda with markdown-driven todos for each family member. Markdown files remain the single source of truth, while Prisma/SQLite provide a fast cache for querying and UI interactions.

## Stack

- Next.js 14 App Router + TypeScript + SWR
- Prisma + SQLite (with markdown sync + recurrence helpers)
- Google Calendar API (service account JWT)
- Admin tools for editing markdown/todos and re-syncing
- Dockerfile + `docker-compose.yml` (port `8080`, persistent SQLite volume)

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` (or `.env.local`) and fill in the values below.

3. **Seed markdown + database**

   ```bash
   npm run todos:sync
   ```

   This parses everything under `content/todos/**` and pushes it into SQLite.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` for the dashboard and `http://localhost:3000/admin` for the markdown control room.

### Key Scripts

| Command                | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Next.js dev server                                            |
| `npm run build`        | Production build output + type/lint checks                    |
| `npm run lint`         | ESLint (Next rules + Prettier)                                |
| `npm run todos:sync`   | Re-parse markdown, update Prisma + SQLite                     |
| `npm run db:migrate`   | Create a new Prisma migration (dev)                           |
| `npm run db:deploy`    | Apply migrations in production                                |
| `npm run db:studio`    | Launch Prisma Studio                                          |

## Environment Variables

| Variable                          | Required | Purpose                                                                 |
| --------------------------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                    | ✓        | SQLite connection string (e.g. `file:./prisma/dev.db`)                  |
| `GOOGLE_CALENDAR_ID`              | ✓        | Calendar ID used for agenda + iframe                                    |
| `GOOGLE_PROJECT_ID`               | ✓        | Owning Google Cloud project                                             |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`    | ✓        | Service account email                                                   |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | ✓     | PEM private key (keep the literal `\n` or use real newlines)            |
| `NEXT_PUBLIC_APP_NAME`            |          | Branding string for headings                                            |
| `NEXT_PUBLIC_CALENDAR_IFRAME_URL` |          | Google Calendar embed URL (include `mode=WEEK` for weekly default)      |

> Tip: keep `.env` for local/dev, `.env.docker` for compose, and share only `.env.example`.

## Markdown Workflow

- Files live at `content/todos/<member>.md`.
- Each file starts with YAML front-matter:

  ```yaml
  ---
  member: alex
  name: Alex
  color: "#2563eb"
  timezone: America/Los_Angeles
  ---
  ```

- Todos are `- [ ]` task list items. Indented metadata lines support:

  ```
  - [ ] Pack lunch
    id: pack-lunch
    recurring: weekday@07:15
    time: 07:15
    notes: Sandwich + fruit
    tags: kitchen,school
  ```

- Supported recurrence shorthand:
  - `daily@07:30`
  - `weekday@07:15`
  - `weekly:MON,WED@19:00`
  - `monthly:15@20:00`

- After editing, either run `npm run todos:sync` or use the `/admin` page to save and re-sync.

## Admin Console (`/admin`)

- **Run Sync** – forces markdown → SQLite refresh.
- **Upload Markdown** – drop a new `.md` file for a family member.
- **Inline editor** – edit/save existing markdown files without leaving the browser.

## Docker

Multi-stage Dockerfile (`node:20-alpine`) and compose file included.

```bash
cp .env.example .env        # provide real secrets before building
docker compose up --build
```

Compose exposes `http://localhost:8080`, mounts `./content` for live markdown edits, and binds a named volume `sqlite-data` to persist `prisma/*.db`.

## API Overview

| Method/Route           | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `GET /api/calendar`    | Google Calendar agenda (server-side service)       |
| `GET /api/todos`       | List todos (filters: `member`, `status`)           |
| `POST /api/todos`      | Create ad-hoc todo (non-markdown)                  |
| `PATCH /api/todos/:id` | Update status/metadata                             |
| `POST /api/todos/clear`| Clear finished todos (optionally per member)       |

All routes run on the Next.js server (Node runtime).

## Project Structure Highlights

- `app/` – App Router routes, layout, `CalendarWidget`, `TodoColumn`, admin page.
- `components/` – shared client components (`CalendarWidget`, `TodoColumn`, `ActionButton`).
- `lib/` – Prisma client, env parser, markdown parser/sync, recurrence utilities.
- `content/todos/` – Markdown source of truth.
- `scripts/sync-markdown.ts` – CLI helper invoked by `npm run todos:sync`.
- `Dockerfile`, `docker-compose.yml` – container workflow.

## Recurring Todos

- Recurrence metadata is stored in `RecurringRule` rows.
- `lib/recurrence.ts` periodically reactivates finished recurring tasks when the next occurrence window opens.
- Manual “Clear finished” button resets completed/cleared tasks while preserving markdown definitions.

---

Questions? See `plan.md` for the original architecture checklist and use `/admin` to keep markdown + database in sync. Happy coordinating!

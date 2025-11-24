# Family Coordination App Plan

## Architecture & Scaffolding

1. Initialize a Next.js 14 project (App Router) with TypeScript under `app/`, configure ESLint/Prettier, and set up environment handling for local and Docker builds.
2. Introduce SQLite via Prisma (or equivalent ORM) with migrations stored in `prisma/`, exposing todo data through Next.js API routes (`app/api/todos/`).

## Calendar Integration

1. Implement a server-side service in `lib/googleCalendar.ts` that authenticates with Google Calendar API using service-account credentials and fetches upcoming events.
2. Expose calendar data through an API route (`app/api/calendar/route.ts`) and build a reusable calendar widget component (`components/CalendarWidget.tsx`) that renders the fetched events in a tablet-friendly agenda layout beneath the embedded Google calendar iframe (for live view).

## Markdown-Driven Todo Management

1. Define a markdown structure per family member under `content/todos/<member>.md`, parse it server-side (e.g., `lib/markdownTodos.ts`) into normalized entries stored in SQLite for quick querying and caching.
2. Build an admin page (`app/admin/page.tsx`) that lists all markdown-derived todos, supports inline editing or file upload, and triggers a re-parse/write-back flow before persisting changes to both markdown files and SQLite.
3. Some of the TODO's can be recurring. Allow me the annotate, in the markdown which TOODs are recurring, and at what time of the day they should appear. 
4. When i check off a TODO in the ui, it should be greyed out.
5. Add a button for "clear finished TODOs". When the TODOs recur, they should reappear when the time is right.

## UI & UX Implementation

1. Create a responsive layout (`app/layout.tsx`, `app/page.tsx`) optimized for tablet and laptop, stacking the Google Calendar widget on top and the per-member todo panels below with real-time refresh (SWR or streaming route).
2. Provide per-member todo components (`components/TodoColumn.tsx`) with status indicators, daily filters, and auto-refresh when markdown changes are detected.

## Deployment & Tooling

1. Author a `Dockerfile` (multi-stage build) and `docker-compose.yml` exposing port 8080, ensuring SQLite persistence via a bind-mounted volume.
2. Document configuration (`README.md`) covering environment variables (Google credentials/calendar ID), markdown editing workflow, Docker commands, and tablet setup instructions.

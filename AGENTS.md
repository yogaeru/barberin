# AGENTS

## Project Snapshot

- Stack: Express 5 + EJS + express-ejs-layouts + Alpine.js 3 + DaisyUI 5 + TailwindCSS 4 (CDN).
- Module system: ESM (`"type": "module"` in `package.json`). All imports use ESM `import`.
- Entry point: `server.js`.
- Active views: `src/views/`. Legacy `views/` folder is unused — never touch it.
- All frontend deps loaded via CDN in `src/views/layout.ejs` (DaisyUI, Tailwind browser build, Alpine.js 3). No build step.

## Target Architecture

For future work, prefer a cookie-based MVC structure instead of expanding the current demo-store pattern:

- **Authentication**: use signed, HTTP-only cookies for session/auth state; avoid adding new `localStorage` auth persistence.
- **Structure**: keep presentation in `src/views/`, request handling in `src/controllers/`, and business/data logic in `src/services/`.
- **Routing**: keep `server.js` thin; it should wire routes to controllers and middleware, not hold business rules.
- **Data access**: move reusable data queries and transformations into services; controllers should only validate input and shape responses.
- **Views**: continue using EJS in `src/views/`, but keep templates focused on rendering data passed in by controllers.

## Workspace Snapshot

A brief, auto-updated snapshot of key files and folders in this workspace to help AI agents orient quickly:

- `server.js` — Express entrypoint and route registrations
- `package.json` — project metadata and scripts (uses ESM)
- `src/views/` — EJS templates (pages + `partials/`)
  - `src/views/partials/storageHelpers.ejs` — demo `BarberSyncStore` (localStorage APIs)
  - `src/views/admin/` — admin pages and admin layout
- `src/lib/` — small server helpers (`auth.js`, `database.js`, `timeSlots.js`)
- `src/db/` — SQL migrations and seed data (`001_create_tables.sql`, `001_seed_data.sql`)
- `views/` — legacy/unused view folder (do not edit)

This snapshot is intentionally short — details and conventions live in this file and in `src/views/` files.

## Run & Verify

```bash
npm install         # install deps
npm run dev         # node --watch server.js (auto-restart on save)
npm test            # placeholder — always fails by design
```

App runs at `http://localhost:3000`.

## Key Architecture

### Routes in `server.js`

7 EJS pages, all rendered with `title`, `currentPage`, and optionally `services` (mock data):

| Path         | View            | `currentPage` | Notes                           |
| ------------ | --------------- | ------------- | ------------------------------- |
| `/`          | `index.ejs`     | `"index"`     | home, receives `services` array |
| `/booking`   | `booking.ejs`   | `"booking"`   | receives `services` array       |
| `/status`    | `status.ejs`    | `"status"`    | —                               |
| `/dashboard` | `dashboard.ejs` | `"dashboard"` | —                               |
| `/about`     | `about.ejs`     | `"about"`     | —                               |
| `/login`     | `login.ejs`     | `"login"`     | `layout: false`                 |
| `/register`  | `register.ejs`  | `"register"`  | `layout: false`                 |

### Layout system

### Routes & API (quick reference)

- Public pages (GET): `/`, `/booking`, `/status`, `/dashboard`, `/about`, `/login`, `/register`, `/forgot-password`
- Admin pages (GET): `/admin`, `/admin/queue`, `/admin/orders`, `/admin/bookings`, `/admin/history`, `/admin/salary`, `/admin/users`, `/admin/kapster`, `/admin/schedules`

- Public API (JSON):
  - `GET /api/services` — list services
  - `GET /api/barbers?date=YYYY-MM-DD` — barbers availability for date
  - `GET /api/schedules?date=YYYY-MM-DD&barberId=<id>` — schedules
  - `GET /api/public/bootstrap?date=YYYY-MM-DD` — combined bootstrap data (services, barbers, schedules)

- Auth/API (token-based, demo):
  - `POST /api/auth/login` — body: `{ identifier, password }`
  - `POST /api/auth/register` — body: registration fields
  - `GET /api/auth/me` — returns current auth (requires token)

- Booking API (requires auth):
  - `GET /api/bookings/me` — user bookings
  - `POST /api/bookings` — create booking

- Admin API (requires admin token):
  - `PATCH /api/admin/queue/:bookingId/status` — update booking status
  - `POST /api/admin/schedules/generate` — generate schedules
  - `PATCH /api/admin/schedules/:scheduleId` — update schedule status
  - `POST /api/admin/barbers/:id/toggle` — toggle barber availability
  - `GET /api/admin/dashboard` — admin dashboard summary

Refer to `server.js` for full behavior and required request body shapes.

- `layout.ejs` wraps all pages except login/register (they set `layout: false` and include sidebar + bottomNavbar themselves).
- Layout includes `sidebar.ejs` (desktop, hidden on mobile) and `bottomNavbar.ejs` (mobile, hidden on desktop).
- Sidebar and bottomNavbar use `<%= currentPage %>` (EJS var, not Alpine) for active nav highlighting.
- Partials in `src/views/partials/`: `sidebar.ejs`, `bottomNavbar.ejs`, `header.ejs`, `navbar.ejs` (unused).
- When adding a new page, add the EJS file AND register a route in `server.js`.

### Navigation highlighting

Sidebar/bottomNavbar apply active styles via Alpine `:class` binding with `'<%= currentPage %>' === 'pageName'`. Login & register pages (layout:false) still get `currentPage` from server render — the nav items don't include "login"/"register" so they show default inactive state.

## Frontend Conventions

- **Icons**: Emoji only. Material Symbols CDN is unreliable — never use it.
- **UI copy**: All text in Indonesian. Preserve language when editing.
- **State management**: Alpine.js local state only for UI behavior. Prefer cookie-backed server state for auth and persistence; do not introduce new `localStorage` auth/session flows.
- **Themes**: 6 themes available (`coffee`, `light`, `dark`, `cupcake`, `business`, `emerald`). Applied via `data-theme` attr on `<html>`, stored in localStorage.
- **Mock data**: `services` array lives in `server.js` and is injected into `index.ejs` and `booking.ejs` via `res.render()`.

## Liquid-Glass Design System

Every page uses a consistent glassmorphism card style. The core class set:

```css
bg-base-100/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-base-content/10
```

### Responsive breakpoints used

| Concern           | Mobile (<768px)  | Tablet (768-1023px) | Desktop (≥1024px)               |
| ----------------- | ---------------- | ------------------- | ------------------------------- |
| Nav               | `bottomNavbar`   | `bottomNavbar`      | `sidebar`                       |
| Page body         | `flex-1 min-w-0` | `flex-1 min-w-0`    | `flex-1 min-w-0`                |
| Content max-width | `max-w-7xl`      | `max-w-7xl`         | `max-w-7xl`                     |
| Grid columns      | `grid-cols-1`    | `grid-cols-2`       | varies (`xl:grid-cols-4`, etc.) |
| Text sizing       | `text-3xl`       | `text-4xl`          | `text-5xl`                      |

- All content containers use `max-w-7xl` or `max-w-[90rem]` (1440px) — never `max-w-screen-xl` (too narrow) or `max-w-screen-md`.
- Every page root wrapper gets `flex-1 min-w-0` to fill remaining space in the layout's flex container beside the sidebar.
- `sidebar.ejs` uses `bg-base-100/20 backdrop-blur-2xl` (slightly more transparent, less rounded) — diverges from the standard card pattern.
- `bottomNavbar.ejs` has glass-style backdrop built into its design.

## Pitfalls

- Login/Register pages set `layout: false` — they manually `include('partials/header')`, `sidebar`, and `bottomNavbar` inside their own `x-data` div.
- Each page defines its own Alpine component function (`homeApp`, `bookingApp`, `statusApp`, etc.) in an inline `<script>`.
- `package.json` has `"imports": { "#/*": "./src" }` — available for future server-side imports (not currently used).
- Sidebar search input is decorative only (no functionality wired up).
- `bottomNavbar.ejs` has the "Antrian" button elevated (`-mt-8`, larger circle) as a center-action FAB.

## For AI agents (quick reference)

- Purpose: help AI coding assistants be immediately productive when editing this repo.
- Primary file to read for high-level conventions: `AGENTS.md` (this file).
- Secondary reference: `.github/copilot-instructions.md` for high-level shortcuts and linking.

### Dev commands

Run locally:

```bash
npm install
npm run dev   # runs node --watch server.js
```

App URL: http://localhost:3000

### Key conventions

- Views live in `src/views/` (never edit legacy `views/`).
- Pages use EJS and are rendered server-side via `server.js` — when adding a page, add a route in `server.js` and pass `title` and `currentPage`.
- UI text is Indonesian — preserve language and tone.
- No frontend build step: all frontend libs loaded via CDN in `src/views/layout.ejs`.

### Client-side demo store (`BarberSyncStore`)

This project currently includes a client-side demo store in `src/views/partials/storageHelpers.ejs`, but new work should migrate auth and persistence to cookies + server-side handlers.

- Important `localStorage` keys:
  - `barbersync-users` — array of users
  - `barbersync-user` — current signed-in user
  - `barbersync-queue-index` — global index of queue entries
  - `barbersync-queue:<identifier>` — per-user queue (identifier is `username` or email)

- Common APIs exposed on `window.BarberSyncStore` (read `storageHelpers.ejs` for full details):
  - `seedUsers()`, `getUsers()`, `getCurrentUser()`, `setCurrentUser()`
  - `login(identifier, password)`, `register({...})`, `changePassword(...)`
  - `getCurrentUserQueue()`, `setCurrentUserQueue()`, `getAllQueueEntries()`, `upsertQueueEntry()`, `removeQueueEntry()`
  - `subscribe(callback)` for UI sync

### Frequent issues & fixes

- Login not working: prefer checking cookie/session middleware, controller validation, and auth service behavior before editing templates.
- When migrating auth, update request handlers, cookie helpers, and any code that assumes browser-side persistence.
- When editing EJS templates, run the app and check browser console for runtime exceptions — EJS templates include inline scripts which will fail silently at render time.

### Adding new pages / admin views

1. Add the new EJS file under `src/views/` (follow existing page patterns).
2. Add a controller in `src/controllers/` and keep route setup in `server.js` thin.
3. Put reusable business logic in `src/services/` and keep request validation in controllers.
4. If the page should use the layout, leave default; for auth pages set `layout: false`.
5. Use Alpine.js local component pattern like other pages (e.g., `homeApp`, `bookingApp`) for UI-only state.

### Testing & verification

- Manual: run `npm run dev` and verify flows in browser (login/register/booking/status/admin pages).
- Check browser console for errors from inline scripts. If an inline script is malformed, the page may break before Alpine initializes.

### When to ask the human

- If a requested change needs a backend API or persistent DB (this repo is intentionally demo-only).
- If you need new seeded credentials or changes that affect user-visible data model (confirm username vs email choice first).

---

Small edits welcome. Ask if you want a separate `AGENTS-frontend.md` or a `skill` file for common tasks.

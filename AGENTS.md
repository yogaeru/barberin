# AGENTS

High-signal facts for AI agents working in this repo. When in doubt, omit.

## Stack & setup

- **Express 5** (not 4 — `req.query` is `undefined` for missing params).
- **EJS v5** views in `src/views/` (set in `server.js`).
- **SQLite via sql.js** (WASM, in-process). Every non-transaction `run()` calls `persist()`, writing the entire DB to disk. DB file at `src/db/barbersync.sqlite`.
- **Database auto-bootstraps** on import (`src/lib/database.js`): creates tables, seeds demo data, generates today's schedules. Self-heals if DB file is deleted.
- **No build step.** Frontend: Tailwind v4 browser CDN (no `@apply`), DaisyUI 5, Alpine.js 3 — all loaded via CDN in `layout.ejs`.
- **No linter, formatter, test framework, CI, bundler, TypeScript.** `npm test` always fails by design.
- **ESM** (`"type": "module"`). All imports use `import`/`export`.
- Dependencies: `express@^5.2.1`, `ejs@^5.0.2`, `express-ejs-layouts`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `sql.js`.
- **`src/lib/env.js`** auto-loads `dotenv/config` on import (side effect). Never import `dotenv` directly.
- `.env` must exist with `JWT_SECRET` and demo passwords. Committed example present in repo.
- Demo password env vars: `ADMIN_PASSWORD`, `USER_PASSWORD`, `OPERATOR_PASSWORD`. The "barber" role's demo username is `operator`.
- `package.json` has `"imports": { "#/*": "./src" }` — defined but unused.
- Package name is "barberin"; app is branded "BarberSync" in UI.

## Commands

```bash
npm install          # install deps
npm run dev          # node --watch server.js (auto-restart, no nodemon)
npm start            # node server.js (production)
npm test             # placeholder — always fails
```

App runs at `http://localhost:3000`. No build/watch step needed.

## Architecture

```
server.js            — thin entrypoint (middleware + route wiring)
src/routes/index.js  — aggregates 5 route files
src/controllers/     — request handling
src/middleware/      — authRequired, adminRequired, guestOnly, pageRoleRequired
src/services/        — re-export barrels from dataService.js (the real monolith, 849 lines)
src/lib/             — database.js, auth.js (JWT), timeSlots.js, demoCredentials.js, seed.js
src/db/              — 001_create_tables.sql, 001_seed_data.sql, README_barbersync.md
src/views/           — EJS pages + partials/ + admin/
```

- **`dataService.js`** is the monolith: all data queries, business logic, transformations. Service files just re-export it.
- **Auth**: JWT in HttpOnly cookie (`barbersync-token`) + `Authorization: Bearer` header. Also stored in `localStorage` by client-side `BarberSyncStore` (defined in `partials/storageHelpers.ejs`). Two auth systems coexist.
- **Three roles**: `admin`, `user`, `barber`. Demo passwords in `.env` (displayed on login page).
- **`currentPage`** EJS variable must be passed in every `res.render()` — drives nav highlighting.
- **Route guards**: `/booking`, `/status`, `/dashboard`, `/about` require `user` role only. Admin routes require `admin`. `/login`, `/register`, `/forgot-password` redirect to landing if already authed.

### Layout system

| Page type | Layout |
|-----------|--------|
| Public pages (/, /booking, /status, etc.) | `layout.ejs` (default) — `cupcake` theme |
| Login/Register/Forgot password | `layout: false` — manual includes |
| Admin pages | `layout: "admin/layout"` — `business` theme |

### Routes & API

**Public pages (GET):** `/`, `/booking`, `/status`, `/dashboard`, `/about`, `/login`, `/register`, `/forgot-password`

**Admin pages (GET):** `/admin`, `/admin/queue`, `/admin/orders`, `/admin/bookings`, `/admin/history`, `/admin/salary`, `/admin/users`, `/admin/kapster`, `/admin/kapster/toggle/:id`, `/admin/schedules`

**Public API (GET):**
- `/api/services`
- `/api/barbers?date=YYYY-MM-DD`
- `/api/schedules?date=YYYY-MM-DD&barberId=<id>`
- `/api/public/bootstrap?date=YYYY-MM-DD`

**Auth API:** `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`

**Booking API (auth required):** `GET /api/bookings/me`, `POST /api/bookings`

**Admin API (admin token required):**
- `PATCH /api/admin/queue/:bookingId/status`
- `POST /api/admin/schedules/generate`
- `PATCH /api/admin/schedules/:scheduleId`
- `POST /api/admin/barbers/:id/toggle`
- `GET /api/admin/dashboard`

Refer to controllers for request body shapes.

## Business logic

- **Time slots**: 10:30–21:30, 30-min intervals (`TIME_START`, `TIME_END`, `SLOT_MINUTES` in `src/lib/timeSlots.js`).
- **Booking status flow**: `menunggu → dikonfirmasi → dalam_proses → selesai` (or `dibatalkan`). Completing/cancelling frees the schedule slot (status back to `tersedia`).
- **1 active booking per user** — `createBooking` rejects if user already has a non-terminal (`!selesai && !dibatalkan`) booking.
- **Schedules auto-generate** for today on DB bootstrap. Admin can generate for any date via `POST /api/admin/schedules/generate`.

## Frontend conventions

- **UI copy**: All text in Indonesian. Preserve language.
- **Icons**: Emoji only. Never add Material Symbols or icon libraries.
- **Themes**: `coffee`, `light`, `dark`, `cupcake`, `business`, `emerald` — stored in `localStorage`, applied via `data-theme`.
- **Alpine.js**: Each page defines its own component function (`homeApp`, `bookingApp`, `statusApp`, etc.) in an inline `<script>`. State for UI behavior only.
- **Glassmorphism cards**: `bg-base-100/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-base-content/10`
- **Sidebar search input** is decorative — no functionality wired.
- **Bottom navbar** has FAB "Antrian" button (`-mt-8`, larger circle).

## Key gotchas

- Express 5: `req.query.date` is `undefined` (not `""`) when param missing — controllers use optional chaining.
- The `status.ejs` page reads queue data from `localStorage` via `BarberSyncStore`, NOT from the API.
- Login saves JWT to **both** HttpOnly cookie (server) and `localStorage` (client-side store) independently.
- No `public/` or `static/` directory — all frontend assets are CDN-only.
- No CORS middleware — single-origin only.
- `server.js` sets `res.locals.demoUsers` globally — every view can access `demoUsers` without passing it to `res.render()`.
- Adding a page: create EJS in `src/views/`, add route in the appropriate `src/routes/` file, pass `title` + `currentPage`.

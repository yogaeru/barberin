# BarberSync

A barbershop booking and queue management system. Built with Express 5, SQLite (in-process), and a CDN-driven frontend (Tailwind v4 + DaisyUI 5 + Alpine.js 3).

## Quick start

```bash
cp .env.example .env   # already committed; just ensure it exists
npm install
npm run dev            # http://localhost:3000
```

No build step — frontend assets are loaded via CDN.

## Demo accounts

| Role     | Username   | Password        |
|----------|------------|-----------------|
| Admin    | `admin`    | `admin123`      |
| User     | `user`     | `user123`       |
| Operator | `operator` | `operator123`   |

Credentials are shown on the login page.

## Tech stack

- **Runtime:** Node.js (ESM)
- **Backend:** Express 5, EJS v5, express-ejs-layouts
- **Database:** SQLite via sql.js (WASM, in-process, auto-bootstraps)
- **Auth:** JWT (HttpOnly cookie + Bearer header), bcryptjs
- **Frontend:** Tailwind CSS v4 (CDN), DaisyUI 5, Alpine.js 3
- **No build step, no bundler, no TypeScript, no linter, no test framework**

## Architecture

```
server.js                  — entrypoint (middleware + route wiring)
src/
  routes/                  — Express route definitions (5 files)
  controllers/             — Request handlers
  middleware/              — Auth guards (authRequired, adminRequired, etc.)
  services/                — Business logic (11 domain files)
    bookingService.js      — Bookings, queue, history
    barberService.js       — Barbers, availability, salary
    scheduleService.js     — Schedule generation & management
    userService.js         — Users, authentication, registration
    serviceService.js      — Services CRUD
    paymentService.js      — Payments & orders
    dashboardService.js    — Dashboard aggregation
    pageService.js         — Page-level data composition
    adminService.js        — Admin barrel (re-exports)
    publicService.js       — Public barrel (re-exports)
    authService.js         — Auth barrel (re-exports)
  lib/                     — Core utilities
    database.js            — SQLite init, queries, persistence
    auth.js                — JWT sign/verify
    timeSlots.js           — Time slot configuration
    demoCredentials.js     — Demo user definitions
    env.js                 — Env loader (side-effect)
    seed.js                — Database seeding
  db/                      — SQL schema & seed files
  views/                   — EJS templates
    partials/              — Layout components (sidebar, nav, etc.)
    admin/                 — Admin panel views & layout
```

### Three auth layers coexist

1. **HttpOnly cookie** (`barbersync-token`) — set by server on login, sent automatically
2. **Authorization header** (`Bearer`) — for API calls
3. **localStorage** (`barbersync-user`) — read by client-side `BarberSyncStore`

### Roles

| Role     | Pages                                  |
|----------|----------------------------------------|
| `admin`  | `/admin/*`, `/`                        |
| `user`   | `/booking`, `/status`, `/about`, `/dashboard`, `/` |
| `barber` | `/` only                               |

### Middleware

| Guard                  | Behavior                                      |
|------------------------|-----------------------------------------------|
| `authRequired`         | 401 JSON if no valid JWT                      |
| `adminRequired`        | 403 JSON if role ≠ admin                      |
| `guestOnly`            | Redirect to landing if already authenticated  |
| `pageRoleRequired`     | Redirect to `/login` or role landing if wrong role |

## Routes

### Public pages

| Method | Path               | Middleware                           | Description              |
|--------|--------------------|--------------------------------------|--------------------------|
| GET    | `/`                | —                                    | Home page                |
| GET    | `/booking`         | `pageRoleRequired(["user"])`         | Booking form             |
| GET    | `/status`          | `pageRoleRequired(["user"])`         | Queue status             |
| GET    | `/dashboard`       | `pageRoleRequired(["user"])`         | User dashboard           |
| GET    | `/about`           | `pageRoleRequired(["user"])`         | Profile & settings       |
| GET    | `/login`           | `guestOnly`                          | Login form               |
| GET    | `/register`        | `guestOnly`                          | Register form            |
| GET    | `/forgot-password` | `guestOnly`                          | Password reset (UI only) |

### Public API

| Method | Path                            | Description                              |
|--------|---------------------------------|------------------------------------------|
| GET    | `/api/services`                 | List all active services                 |
| GET    | `/api/barbers?date=YYYY-MM-DD`  | List barbers with availability           |
| GET    | `/api/schedules?date=&barberId=`| Schedule slots (date required)           |
| GET    | `/api/public/bootstrap?date=`   | Combined services + barbers + schedules  |

### Auth API

| Method | Path                | Middleware       | Description                     |
|--------|---------------------|-----------------|---------------------------------|
| POST   | `/api/auth/login`   | —               | Login, returns JWT + user       |
| POST   | `/api/auth/register`| —               | Register new account            |
| POST   | `/api/auth/logout`  | —               | Clear HttpOnly cookie           |
| GET    | `/api/auth/me`      | `authRequired`  | Current user profile            |

### Booking (auth required)

| Method | Path                | Middleware       | Description                     |
|--------|---------------------|-----------------|---------------------------------|
| POST   | `/booking/create`   | `authRequired`  | Create booking (form POST)      |
| GET    | `/api/bookings/me`  | `authRequired`  | List current user's bookings    |
| POST   | `/api/bookings`     | `authRequired`  | Create booking (JSON API)       |

### Admin pages (role: admin)

| Method | Path                               | Middleware           | Description             |
|--------|------------------------------------|----------------------|-------------------------|
| GET    | `/admin`                           | `pageRoleRequired`   | Dashboard overview      |
| GET    | `/admin/queue`                     | `pageRoleRequired`   | Queue management        |
| GET    | `/admin/orders`                    | `pageRoleRequired`   | Orders & payments       |
| GET    | `/admin/bookings`                  | `pageRoleRequired`   | All bookings            |
| GET    | `/admin/history`                   | `pageRoleRequired`   | Completed/cancelled     |
| GET    | `/admin/salary`                    | `pageRoleRequired`   | Barber salary calc      |
| GET    | `/admin/users`                     | `pageRoleRequired`   | User management         |
| GET    | `/admin/kapster`                   | `pageRoleRequired`   | Barber list & toggle    |
| GET    | `/admin/schedules`                 | `pageRoleRequired`   | Schedule grid           |
| GET    | `/admin/kapster/toggle/:id`        | `pageRoleRequired`   | Toggle barber (302 redirect) |
| POST   | `/admin/queue/update-status`       | `pageRoleRequired`   | Update booking status (302)   |
| POST   | `/admin/schedules/generate`        | `pageRoleRequired`   | Generate schedule (302)       |
| POST   | `/admin/schedules/:id/status`      | `pageRoleRequired`   | Update slot status (302)      |

### Admin API (role: admin)

| Method | Path                                  | Middleware        | Description                    |
|--------|---------------------------------------|-------------------|--------------------------------|
| GET    | `/api/admin/dashboard`                | `adminRequired`   | Dashboard JSON data            |
| PATCH  | `/api/admin/queue/:bookingId/status`  | `adminRequired`   | Change booking status          |
| POST   | `/api/admin/schedules/generate`       | `adminRequired`   | Generate schedule for date     |
| PATCH  | `/api/admin/schedules/:scheduleId`    | `adminRequired`   | Update a schedule slot         |
| POST   | `/api/admin/barbers/:id/toggle`       | `adminRequired`   | Toggle barber availability     |

## Scripts

```bash
npm run dev    # node --watch (auto-restart)
npm start      # node server.js (production)
npm test       # placeholder — always fails
```

## Business rules

- **Time slots:** 10:30–21:30, 30-min intervals
- **Booking flow:** `menunggu → dikonfirmasi → dalam_proses → selesai` (or `dibatalkan`)
- **1 active booking per user** — creating a new booking rejects if one is already active
- **Schedules auto-generate** for today on DB bootstrap; admin can generate for any date

## License

ISC

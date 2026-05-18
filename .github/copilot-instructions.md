# Copilot Instructions for this repository

This file points AI assistants to the primary developer reference and highlights conventions.

See the main agent guidance: AGENTS.md

Key points for AI assistants:

- Project: Node + Express (ESM) with EJS views in `src/views/`.
- No frontend build step; all frontend libs are loaded via CDN.
- UI text is in Indonesian — preserve language.
- Prefer a cookie-based auth flow and server-side persistence; avoid adding new `localStorage` auth/session logic.
- Keep the codebase split into `src/views/`, `src/controllers/`, and `src/services/` for new work.
- When adding views, update route wiring in `server.js`, set `currentPage` on render, and keep business logic out of templates.

Reference: AGENTS.md

# Barberia Project Guidelines

## Project Goal

This is a SaaS barber-management application. Keep changes clear and approachable for a junior developer. Prefer a working product and small, explicit changes over sophisticated architecture.

## Stack

- Frontend: static HTML, CSS, and vanilla JavaScript.
- Backend: Express and MySQL using `mysql2`.
- Authentication: JWT.
- Database migrations: SQL files in `backend/migrations/`, run with `npm run migrate` from `backend/`.

## Multitenancy

Use the shared `barberias` table as the tenant boundary. Tenant-owned tables are `usuarios`, `servicios`, `clientes`, and `reservas`; each must have `barberia_id`.

- A user belongs to one barberia.
- Include `barberia_id` in the authenticated JWT payload.
- Scope every tenant-owned read, insert, update, and delete by `barberia_id` from the authenticated user, never by a client-supplied tenant ID.
- Service names and booking slots are unique within a barberia, not globally.
- Keep roles simple strings such as `admin` and `barbero`.
- Do not add separate databases, membership tables, permission frameworks, repositories, event sourcing, or other general-purpose abstractions unless a concrete product need requires them.

## Database

- Add schema changes as a new numbered migration; do not edit an already-applied migration.
- Use InnoDB, `utf8mb4`, foreign keys, and indexes that serve actual queries.
- Preserve migration ordering and the `schema_migrations` tracking table.
- Enforce booking slot uniqueness with `(barberia_id, fecha, hora)`.
- Make seed data safe to run once and ensure it does not overwrite existing tenant records.

## Backend

- Keep route handlers direct and readable; extract helpers only when they remove meaningful repetition.
- Authenticate and authorize all `/api/admin/*` routes.
- Validate input server-side; the frontend is not a trust boundary.
- Use parameterized SQL queries.
- Never log passwords, password hashes, JWTs, or personal customer data.
- Require `JWT_SECRET` from the environment in production; do not rely on a default secret.

## Frontend

- Continue using vanilla JavaScript unless a framework solves a concrete need.
- Use relative API paths such as `/api/reservas`, never hard-coded `localhost` URLs.
- Render user-controlled data with DOM APIs and `textContent`; do not interpolate it into `innerHTML` or inline event handlers.
- Keep screens and workflows understandable without build tooling.

## Product Scope

Focus on:

1. Public appointment booking.
2. Tenant-scoped service management.
3. Tenant-scoped appointment calendar and status updates.
4. Simple staff and admin access.

Avoid adding billing, subscriptions, complex staff scheduling, customer portals, notifications, analytics pipelines, or integrations until a concrete product need is agreed.

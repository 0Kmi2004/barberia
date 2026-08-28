# Barbería SaaS: Project Context

## Project goal

This is a SaaS barber-management application. It started as a single-barbería booking site and is being evolved into a multi-tenant product while remaining approachable for a junior developer to maintain.

The priority is a clear, working product over sophisticated architecture. Prefer small, explicit changes that follow the existing code style.

## Current stack

- Frontend: static HTML, CSS, and vanilla JavaScript.
- Backend: Express and MySQL (`mysql2`).
- Authentication: JWT.
- Database migrations: SQL files in `backend/migrations/`, run with `npm run migrate` from `backend/`.

## Multitenancy model

Use a shared database with a `barberias` table as the tenant boundary.

Tenant-owned tables should have `barberia_id`:

- `usuarios`
- `servicios`
- `clientes`
- `reservas`

Keep the model simple:

- A user belongs to one barbería.
- Authentication includes `barberia_id` in the JWT payload.
- Every tenant-owned read, insert, update, and delete is scoped by `barberia_id` from the authenticated user—not by a client-supplied tenant ID.
- Service names and booking slots are unique within a barbería, not globally.
- Start with simple string roles such as `admin` and `barbero`.

Do not introduce separate databases per tenant, membership tables, permission frameworks, repositories, event sourcing, or other general-purpose abstractions unless the product genuinely needs them.

## Database guidance

- Add schema changes as a new numbered migration; do not edit an already-applied migration.
- Use InnoDB, `utf8mb4`, foreign keys, and indexes that serve actual queries.
- Preserve existing migration ordering and the `schema_migrations` tracking table.
- Booking slot uniqueness must be tenant-scoped: `(barberia_id, fecha, hora)`.
- Seed data must be safe to run once and must not overwrite a tenant's existing records.

## Backend conventions

- Keep route handlers direct and readable; extract a helper only when it removes meaningful repetition.
- Authenticate and authorize all `/api/admin/*` routes.
- Validate server-side input. The frontend is not a trust boundary.
- Use parameterized SQL queries.
- Never log passwords, password hashes, JWTs, or personal customer data.
- Require `JWT_SECRET` from the environment in production; do not rely on a default secret.

## Frontend conventions

- Keep using vanilla JavaScript unless a framework solves a concrete need.
- Use relative API paths such as `/api/reservas`, never hard-coded `localhost` URLs.
- Render user-controlled data with DOM APIs and `textContent`; do not interpolate it into `innerHTML` or inline event handlers.
- Keep screens and workflows understandable without build tooling.

## Product scope for now

Focus on the core barbería workflow:

1. Public appointment booking.
2. Tenant-scoped service management.
3. Tenant-scoped appointment calendar and status updates.
4. Simple staff/admin access.

Avoid prematurely adding billing, subscriptions, complex staff scheduling, customer portals, notifications, analytics pipelines, or integrations. Add these only when a concrete product need is agreed.

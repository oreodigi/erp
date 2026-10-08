# Feature status

## Functional and production-connected

- Secure login with PostgreSQL-backed accounts and server sessions.
- Role-based navigation and direct-route guards for ERP roles.
- Super Admin credential administration: account listing, role changes, activation, and one-time password reset.
- PostgreSQL-backed shared ERP state with optimistic version checks and audit events.
- Work items and training APIs with validation, role checks, and audit logging.
- Per-user dashboard layout preferences stored in PostgreSQL; customize, resize, reorder, and reset.
- Communication module: direct/group conversations, ERP references, enquiries, assignable tasks, polling refresh, and administrator oversight audit.
- Original ERP navigation and workflow screens restored from the preserved prototype.
- Historical logistics, customers, branches, LRs, billing, fleet, rail, warehouse, finance, workshop, reports, and administration data loaded from the preserved historical snapshot.
- Production gateway routes API calls only over HTTPS and forwards bearer authentication.

## Partially functional / migration boundary

- Many original screens use the preserved ERP state document and shared PostgreSQL JSONB persistence rather than individual normalized operational tables.
- Some forms and workflows update the shared ERP state and are not yet connected to a dedicated normalized API endpoint for every legacy transaction.
- The order board and dashboard use preserved historical data plus new operational state; transaction-level concurrency is strongest on the dedicated work, training, communication, and layout APIs.
- Chat currently refreshes by authenticated polling rather than a WebSocket connection.

## Prototype or non-production data

- `source/sk-erp/src/store/seed.ts` is sample/demo seed data and must not be used as production data.
- Prototype-only static artifacts and uploaded archives are excluded from the production repository.
- Any screen showing example values from the original prototype must be replaced with live PostgreSQL data before being advertised as a completed transaction workflow.

## Explicitly not included yet

- File/image attachments in chat.
- Push notifications, email notifications, and WebSocket presence.
- Full normalized API coverage for every legacy form and report.
- Automated browser/mobile end-to-end tests in this server environment.

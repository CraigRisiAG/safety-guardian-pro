# Database Migrations (PostgreSQL)

`run-migrations.ps1` uses `psql` and optional `DATABASE_URL`.

## NPM commands

```bash
npm run db:migrate   # apply 001 schema
npm run db:seed      # apply 002 seed data
npm run db:reset     # apply 003 reset helper
npm run db:reseed    # reset then seed
npm run db:setup     # schema + seed
```

Run these SQL files in order:

1. `001_initial_safety_guardian_schema.sql`
2. `002_seed_test_data.sql`
3. `003_seed_reset.sql` (optional helper for local/dev)

## Example

```sql
\i database/migrations/001_initial_safety_guardian_schema.sql
\i database/migrations/002_seed_test_data.sql
```

## Reset and reseed (local/dev)

```sql
\i database/migrations/003_seed_reset.sql
\i database/migrations/002_seed_test_data.sql
```

Seed data includes:
- 1 organization
- 3 sites
- 6 users with `staff_code` values
- weekly office schedules (`user_office_schedule`)
- separate admin profile and audit entries
- incidents, drills, safety check-ins, and dashboard metrics

Use in local/dev environments only.

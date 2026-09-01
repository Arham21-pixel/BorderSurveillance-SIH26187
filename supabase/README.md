# Supabase

Schema lives in `migrations/`. Apply in order in the SQL editor, or with the Supabase CLI.

```bash
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Tables:

- `profiles` — operator roles
- `cameras` — registry
- `events` — behaviour / risk events
- `alerts` — operator queue

Row Level Security is on for every public table. The FastAPI service uses the service role key on the server only — never put it in the frontend.

# Supabase Setup

## 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note your project URL and service-role key.

## 2. Apply the migration

**Option A — Supabase dashboard:**
1. Open the SQL editor in your project
2. Paste the contents of `migrations/0001_init.sql`
3. Run it

**Option B — Supabase CLI:**
```bash
npx supabase db push --project-ref <your-project-ref>
```

## 3. Create the storage bucket

In the Supabase dashboard → Storage → Create bucket:
- Name: `plant-images`
- Public: **No** (private)

Or via CLI:
```bash
npx supabase storage buckets create plant-images --project-ref <your-project-ref>
```

## 4. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API → service_role secret
- `SUPABASE_STORAGE_BUCKET` — `plant-images`

## Schema overview

| Table | Purpose |
|---|---|
| `devices` | Anonymous device sessions (cookie-based) |
| `scans` | Plant photo + diagnosis results |
| `chat_messages` | Multi-turn follow-up chat per scan |
| `reminders` | Plant care reminders |
| `rate_limits` | Per-device scan rate limiting |

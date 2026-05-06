-- ============================================================
-- PlantDoctor — initial schema
-- Apply via: Supabase CLI or paste in the SQL editor
-- ============================================================

-- ---------- Custom types ----------

create type urgency_level as enum ('low', 'medium', 'high');
create type chat_role as enum ('user', 'assistant');
create type recurrence_type as enum ('none', 'daily', 'weekly', 'biweekly', 'monthly');

-- ---------- Devices (anonymous sessions) ----------

create table devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,            -- null until real auth is added
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index devices_user_id_idx on devices(user_id) where user_id is not null;

-- ---------- Scans ----------

create table scans (
  id                   uuid primary key default gen_random_uuid(),
  device_id            uuid not null references devices(id) on delete cascade,
  image_path           text not null,
  plantnet_raw         jsonb,
  flora_raw            jsonb,
  gemini_raw           jsonb,
  species_scientific   text,
  species_common       text,
  species_confidence   numeric(5,4),   -- 0.0000 – 1.0000
  urgency              urgency_level,
  summary              text,
  likely_issues        jsonb,          -- serialized DiagnosisIssue[]
  recommended_actions  jsonb,          -- string[]
  follow_up_questions  jsonb,          -- string[]
  is_favorite          boolean not null default false,
  created_at           timestamptz not null default now()
);

create index scans_device_id_idx on scans(device_id);
create index scans_device_favorite_idx on scans(device_id, is_favorite) where is_favorite = true;
create index scans_created_at_idx on scans(device_id, created_at desc);

-- ---------- Chat messages ----------

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references scans(id) on delete cascade,
  role        chat_role not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index chat_messages_scan_id_idx on chat_messages(scan_id, created_at asc);

-- ---------- Reminders ----------

create table reminders (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references devices(id) on delete cascade,
  scan_id     uuid references scans(id) on delete set null,
  title       text not null,
  notes       text,
  due_at      timestamptz not null,
  recurrence  recurrence_type not null default 'none',
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index reminders_device_id_idx on reminders(device_id, due_at asc);

-- ---------- Rate limits ----------

create table rate_limits (
  device_id   uuid primary key references devices(id) on delete cascade,
  tokens      integer not null default 0,
  last_reset  timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Server uses service-role key (bypasses RLS). Policies are written for
-- future migration to JWT-based auth (anon key).

alter table devices        enable row level security;
alter table scans          enable row level security;
alter table chat_messages  enable row level security;
alter table reminders      enable row level security;
alter table rate_limits    enable row level security;

-- When JWT auth is added: authenticate via devices.user_id = auth.uid()
-- For now, service-role key sidesteps these policies entirely.

-- ---------- Storage bucket ----------
-- Run this in the Storage section of Supabase dashboard, or via:
--   supabase storage create plant-images --public=false
-- Then set the policy below.

-- NOTE: bucket creation must be done via dashboard or CLI:
--   supabase storage buckets create plant-images

-- The bucket policy below grants the service-role full access.
-- If you switch to anon key + JWT later, add per-user path policies.

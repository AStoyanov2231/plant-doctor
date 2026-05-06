# PlantDoctor — Backend & Core Implementation Plan

## Context

The repository currently contains only `Idea.md`. The goal is to scaffold a **mobile-first web app** ("Flower Doctor") that lets a non-technical user upload a plant photo and receive a friendly diagnosis. The pipeline is: **PlantNet → FloraAPI → Gemini Flash**.

This plan covers **backend, data layer, API integrations, and core domain logic only** — no UI. UI/pages will be designed later in a separate pass with Claude Design, so the project must expose clean, documented server endpoints + TypeScript contracts that any frontend can consume.

### Decisions confirmed with the user
- **Stack:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Persistence:** Supabase (Postgres + Storage). Single project for DB, file storage, and (future) auth.
- **Auth:** No real auth. A long-lived signed HTTP-only cookie carrying an anonymous `device_id` (UUID) — set on first request, persists indefinitely. Designed so a real `user_id` can be added later without schema rewrites.
- **External APIs:**
  - PlantNet — `POST https://my-api.plantnet.org/v2/identify/{project}?api-key=…` (multipart `images`, returns `bestMatch` + scored `results[]`).
  - FloraAPI — `https://floraapi.com` / `https://api.floraapi.com` for disease/health analysis. Exact endpoint shape must be confirmed from user's FloraAPI dashboard docs.
  - Google Gemini Flash (`gemini-2.5-flash`) for the conversational synthesis layer.
- **Scope:** Required MVP features + multi-turn follow-up chat + save-favorites + plant-care reminders.

---

## Architecture Overview

```
┌──────────────┐        ┌──────────────────────────────────────────┐
│  Future UI   │  HTTP  │  Next.js App Router (api routes / RSC)   │
│ (Claude      │ ─────▶ │                                          │
│  Design)     │        │  /api/scan       (upload + run pipeline) │
└──────────────┘        │  /api/scans      (list / get / favorite) │
                        │  /api/chat       (multi-turn follow-up)  │
                        │  /api/reminders  (CRUD)                  │
                        │  /api/session    (ensure device cookie)  │
                        └────────────┬─────────────────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                ▼                    ▼                    ▼
         services/plantnet    services/flora       services/gemini
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Supabase            │
                          │  • Postgres tables   │
                          │  • Storage bucket    │
                          └──────────────────────┘
```

The `/api/scan` route is the orchestration heart: it stores the image, calls PlantNet, calls FloraAPI, calls Gemini, persists the scan record, and returns the diagnosis.

---

## Project Layout

```
PlantDoctor/
├─ Idea.md
├─ Implementation.md
├─ package.json
├─ next.config.ts
├─ tsconfig.json
├─ .env.local.example
├─ .gitignore
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx             ← minimal shell (Claude Design will replace)
│  │  ├─ page.tsx               ← placeholder for now
│  │  └─ api/
│  │     ├─ session/route.ts
│  │     ├─ scan/route.ts
│  │     ├─ scans/route.ts
│  │     ├─ scans/[id]/route.ts
│  │     ├─ chat/route.ts
│  │     └─ reminders/
│  │        ├─ route.ts
│  │        └─ [id]/route.ts
│  ├─ lib/
│  │  ├─ env.ts
│  │  ├─ session.ts
│  │  ├─ supabase/
│  │  │  ├─ server.ts
│  │  │  └─ types.ts
│  │  ├─ services/
│  │  │  ├─ plantnet.ts
│  │  │  ├─ flora.ts
│  │  │  └─ gemini.ts
│  │  ├─ pipeline/
│  │  │  └─ diagnose.ts
│  │  ├─ prompts/
│  │  │  ├─ diagnosis.ts
│  │  │  └─ chat.ts
│  │  ├─ rate-limit.ts
│  │  ├─ errors.ts
│  │  └─ schemas.ts
│  └─ types/
│     └─ domain.ts
└─ supabase/
   ├─ migrations/
   │  └─ 0001_init.sql
   └─ README.md
```

---

## Data Model (Supabase / Postgres)

All tables carry `device_id uuid not null` and a nullable `user_id uuid` for forward-compat.

| Table | Purpose | Key columns |
|---|---|---|
| `devices` | Tracks anonymous sessions | `id (uuid pk)`, `created_at`, `last_seen_at`, `user_id nullable` |
| `scans` | One row per uploaded photo + diagnosis | `id`, `device_id`, `image_path`, `plantnet_raw jsonb`, `flora_raw jsonb`, `gemini_raw jsonb`, `species_scientific`, `species_common`, `species_confidence`, `urgency` (enum), `summary text`, `is_favorite bool`, `created_at` |
| `chat_messages` | Multi-turn follow-up per scan | `id`, `scan_id (fk)`, `role` (user/assistant), `content text`, `created_at` |
| `reminders` | Care reminders | `id`, `device_id`, `scan_id (fk nullable)`, `title text`, `notes text`, `due_at timestamptz`, `recurrence` (enum), `done_at nullable`, `created_at` |

**Storage:** Private bucket `plant-images`. Keys: `{device_id}/{scan_id}.{ext}`. Returned as signed URLs (~1h TTL).

**RLS:** Enabled but server uses service-role key (bypasses RLS). Policies written for future JWT auth upgrade.

---

## API Endpoints

All routes return `application/json`. Errors: `{ error: { code, message } }`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/session` | Ensure device cookie; returns `{ device_id }` |
| `POST` | `/api/scan` | Multipart: `image` file + optional `organs`. Runs full pipeline. Returns `{ scan }` |
| `GET` | `/api/scans` | List scans for device. Query: `favorite`, `limit`, `cursor` |
| `GET` | `/api/scans/[id]` | Single scan + chat messages |
| `PATCH` | `/api/scans/[id]` | Update `is_favorite` |
| `DELETE` | `/api/scans/[id]` | Delete scan + storage object + related rows |
| `POST` | `/api/chat` | Body: `{ scan_id, message }`. Returns assistant message |
| `GET` | `/api/reminders` | List reminders for device |
| `POST` | `/api/reminders` | Create reminder |
| `PATCH` | `/api/reminders/[id]` | Update reminder (incl. mark done) |
| `DELETE` | `/api/reminders/[id]` | Delete reminder |

---

## Service Modules

### PlantNet (`lib/services/plantnet.ts`)
- `POST https://my-api.plantnet.org/v2/identify/all?api-key=…&lang=en&nb-results=5`
- Multipart: field `images[]`, optional `organs[]`
- Returns: `{ bestMatch, topResults: [{ scientificName, commonNames, score }], raw }`

### FloraAPI (`lib/services/flora.ts`)
- **NOTE:** Exact endpoint shape not publicly accessible at planning time. Wrapper is a stub with `TODO(flora-shape)` comments. Implementer must consult the FloraAPI dashboard docs and fill in the request/response mapping.
- Returns: `{ diseases: [{ name, probability, treatment? }], careAdvice?: { watering?, light?, soil? }, raw }`

### Gemini (`lib/services/gemini.ts`)
- SDK: `@google/genai`, model `gemini-2.5-flash`
- `generateDiagnosis()` — structured JSON output via `responseMimeType: "application/json"`
- `chatFollowUp()` — free-text, grounded in original diagnosis context
- Diagnosis output schema:
  ```ts
  {
    summary: string,
    likelyIssues: { name: string, probability: 'low'|'medium'|'high', why: string }[],
    recommendedActions: string[],
    urgency: 'low'|'medium'|'high',
    followUpQuestions: string[]
  }
  ```

---

## Session Handling

`lib/session.ts` — `getOrCreateDeviceId(req, res)`:
- Reads `pd_device` cookie (HMAC-signed UUID).
- If absent: generate UUID, HMAC-sign with `SESSION_SECRET`, set `HttpOnly; Secure; SameSite=Lax; Max-Age=315360000` (~10 years).
- Upserts `devices` row.

---

## Prompt Principles (`lib/prompts/diagnosis.ts`)

- Never use absolute language ("definitely", "certainly").
- Phrase issues as probabilities ("possible", "likely", "early signs of").
- Friendly, calm, simple — audience: parents and casual gardeners.
- Do NOT invent diagnoses unsupported by FloraAPI.
- If FloraAPI returned nothing, say so and suggest general care.

---

## Environment Variables (`.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=plant-images

PLANTNET_API_KEY=
FLORA_API_KEY=
FLORA_API_BASE_URL=https://api.floraapi.com
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

SESSION_SECRET=
MAX_IMAGE_MB=10
SCAN_RATE_LIMIT_PER_HOUR=20
```

---

## Implementation Sequence

1. `Implementation.md` to project root ✓
2. Bootstrap Next.js (App Router, TypeScript, no Tailwind)
3. Install deps: `@supabase/supabase-js`, `@google/genai`, `zod`, `sharp`, `cookie`, `@types/cookie`
4. `supabase/migrations/0001_init.sql` + `supabase/README.md`
5. Foundation libs: `env.ts` → `errors.ts` → `supabase/server.ts` → `session.ts` → `schemas.ts` + `types/domain.ts` → `rate-limit.ts`
6. Service wrappers: `plantnet.ts` → `gemini.ts` → `flora.ts` (stub)
7. Pipeline: `pipeline/diagnose.ts` + `prompts/diagnosis.ts` + `prompts/chat.ts`
8. API routes (session → scan → scans → chat → reminders)
9. Placeholder UI (layout + page)
10. Smoke test script (`scripts/smoke.ts`)

---

## Verification Checklist

- [ ] `npm run build` — no TypeScript errors
- [ ] `npm run lint` — no lint errors
- [ ] `curl /api/session` → 200, `pd_device` cookie set
- [ ] `curl -X POST /api/scan -F image=@leaf.jpg` → returns Scan with species + summary
- [ ] `curl /api/scans` → list contains the scan
- [ ] `PATCH /api/scans/{id}` with `is_favorite: true` → toggles
- [ ] `POST /api/chat` with follow-up → assistant message returned
- [ ] Reminders CRUD round-trip works
- [ ] No API keys in client bundle
- [ ] Second device (cleared cookie) cannot see first device's scans

---

## Open Items

- **FloraAPI shape:** Wire up once user provides dashboard docs. Stub returns `{ diseases: [], raw: null }` so pipeline works without it.
- **Gemini structured output:** Use SDK `responseSchema` / `responseMimeType: "application/json"` — do not rely on prompt-only JSON.
- **No UI:** Do not install Tailwind, shadcn, or any component library. Claude Design will choose.
- **Do not commit** real `.env.local`; only `.env.local.example`.

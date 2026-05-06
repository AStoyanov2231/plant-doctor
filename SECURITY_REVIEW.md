# Security Review

## Security Issues

### 1. Race condition in rate limiting — `src/lib/rate-limit.ts`
The check-then-increment is not atomic. Two concurrent POST /api/scan requests can both read `tokens < limit`, both pass, and both increment. Under burst traffic, the rate limit is meaningless.

**Fix:** Use a single atomic `UPDATE rate_limits SET tokens = tokens + 1 WHERE device_id = $1 AND tokens < $2` SQL call, or rely on a DB function with a lock.

---

### 2. No rate limiting on `/api/chat` — `src/app/api/chat/route.ts`
`checkRateLimit` is only called in the scan route. The chat endpoint calls Gemini on every request with no limits. A single device can spam this to exhaust your Gemini quota.

---

### 3. Unbounded chat history → unbounded Gemini context — `src/app/api/chat/route.ts:38`
```ts
const { data: historyRows } = await supabase()
  .from("chat_messages")
  .select("*")
  .eq("scan_id", scan_id)
  .order("created_at", { ascending: true });
  // no .limit(...)
```
An attacker sends 10,000 messages on a scan. Every subsequent chat request loads all of them into Gemini's context, exploding your token bill and eventually failing. Add `.limit(50)` or similar.

---

### 4. API key exposed in URL query string — `src/lib/services/plantnet.ts:31-33`
```ts
url.searchParams.set("api-key", apiKey);
```
API keys in URLs end up in server access logs, reverse proxy logs, and any HTTP logging layer. Use an `Authorization` header instead.

---

### 5. MIME type check trusts client data — `src/lib/pipeline/diagnose.ts:27-29`
```ts
const mime = imageFile.type;
if (!["image/jpeg", "image/jpg", "image/png"].includes(mime)) {
```
`imageFile.type` is the `Content-Type` from the multipart form — entirely user-controlled. An attacker can upload a 500MB ZIP with `Content-Type: image/jpeg`. Sharp will fail or process garbage. The check provides false security. Either run magic-byte detection on the buffer, or rely solely on sharp's ability to reject invalid images (and catch its error explicitly).

---

### 6. Orphaned storage files and scan rows on mid-pipeline failure — `src/lib/pipeline/diagnose.ts`
If PlantNet succeeds but Gemini fails (lines 67-98), the function throws but never:
- Deletes the uploaded image from storage
- Deletes the `"pending"` scan row

You accumulate ghost rows and storage objects on every Gemini failure. Wrap the post-upload work in a try/finally that cleans up.

---

### 7. Service role key — all RLS is decorative — `src/lib/supabase/server.ts:12`
```ts
_client = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, ...)
```
The entire migration enables RLS and defines policies for "future JWT auth". In the meantime, all authorization is pure application logic. Any missed `.eq("device_id", deviceId)` — or a future developer adding a query who forgets it — silently leaks all users' data. This is a systemic risk, not a one-off bug. There's currently one instance of this:

In `GET /api/scans/[id]` (`src/app/api/scans/[id]/route.ts:31-35`), `chat_messages` are fetched using only `scan_id` — no re-verification of device ownership on the messages themselves. It's safe only because the scan lookup checks `device_id` first, but it's one logic error away from being a data leak.

---

## Code Quality Issues

### 8. `as any` everywhere defeats type safety
There are 12+ suppressed `@typescript-eslint/no-explicit-any` comments. The generated `Database` types in `supabase/types.ts` should make these unnecessary. This is technical debt that makes type-level bugs invisible.

---

### 9. `DELETE /api/reminders/[id]` always returns 204 — `src/app/api/reminders/[id]/route.ts:71-77`
```ts
const { error } = await supabase().from("reminders").delete().eq("id", id).eq("device_id", deviceId);
if (error) throw new AppError("NOT_FOUND", "Reminder not found");
```
Supabase `.delete()` does not error on 0 rows deleted. If the reminder doesn't exist or belongs to another device, this still returns 204. The `NOT_FOUND` branch is unreachable. While DELETE being idempotent is fine, the error mapping is wrong and misleading.

---

### 10. `session/route.ts` exposes raw device ID in response body
```ts
return NextResponse.json({ device_id: deviceId });
```
The device ID is the sole identity credential. Returning it in the JSON response body makes it accessible to any JavaScript on the page (XSS risk, logging risk). If this is purely for a native mobile client that needs the UUID explicitly, document it. If it's for a web client, remove it — the signed cookie is sufficient.

---

### 11. `env.ts` singleton isn't test-safe — `src/lib/env.ts:27-30`
```ts
let _env: z.infer<typeof schema> | undefined;
export function env() {
  if (!_env) _env = loadEnv();
```
The `_env` module-level singleton is never invalidated. Any test that mocks environment variables after first call will silently use stale values. Either export a `resetEnv()` for tests, or don't cache.

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | Critical | `rate-limit.ts` | Non-atomic check-then-increment |
| 2 | High | `chat/route.ts` | No rate limit on chat |
| 3 | High | `chat/route.ts` | Unbounded history loaded into Gemini |
| 4 | High | `plantnet.ts` | API key in URL query param |
| 5 | Medium | `diagnose.ts` | MIME check trusts client |
| 6 | Medium | `diagnose.ts` | No cleanup on mid-pipeline failure |
| 7 | Medium | `supabase/server.ts` | Service role key makes all RLS inert |
| 8 | Medium | Many files | Widespread `as any` |
| 9 | Low | `reminders/[id]/route.ts` | DELETE always 204, NOT_FOUND unreachable |
| 10 | Low | `session/route.ts` | Device ID in response body |
| 11 | Low | `env.ts` | Singleton not test-safe |

Items 1, 2, and 3 are the ones most likely to cause real damage (rate limit bypass, runaway Gemini bill). Fix those first.

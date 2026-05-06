#!/usr/bin/env npx ts-node
/**
 * Smoke test for the PlantDoctor API.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Run: npx ts-node scripts/smoke.ts [path/to/plant-image.jpg]
 *
 * Requires .env.local to be configured and the Supabase migration applied.
 */

import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const imagePath = process.argv[2] ?? path.join(__dirname, "../samples/leaf.jpg");

let cookie = "";

async function step(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n[${label}] ... `);
  try {
    const result = await fn();
    console.log("OK");
    return result;
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  isForm?: boolean
): Promise<{ status: number; data: unknown; setCookie?: string }> {
  const headers: Record<string, string> = { Cookie: cookie };
  let bodyInit: BodyInit | undefined;

  if (body && isForm) {
    bodyInit = body as FormData;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: bodyInit });
  const setCookieHeader = res.headers.get("set-cookie") ?? "";
  const data = res.status !== 204 ? await res.json().catch(() => ({})) : {};
  return { status: res.status, data, setCookie: setCookieHeader };
}

async function main() {
  console.log(`Smoke testing PlantDoctor at ${BASE_URL}`);
  console.log(`Image: ${imagePath}`);

  if (!fs.existsSync(imagePath)) {
    console.error(`\nImage not found: ${imagePath}`);
    console.error("Place a plant image at samples/leaf.jpg or pass a path as the first arg.");
    process.exit(1);
  }

  // 1. Session
  const session = await step("POST /api/session", async () => {
    const r = await api("POST", "/api/session");
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    if (r.setCookie) cookie = r.setCookie.split(";")[0];
    return r.data;
  });
  console.log("  device_id:", (session as { device_id: string }).device_id?.slice(0, 8) + "...");

  // 2. Scan (POST multipart)
  let scanId = "";
  await step("POST /api/scan", async () => {
    const form = new FormData();
    const imageBytes = fs.readFileSync(imagePath);
    form.append("image", new Blob([imageBytes], { type: "image/jpeg" }), path.basename(imagePath));
    form.append("organs", "auto");

    const r = await api("POST", "/api/scan", form, true);
    if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    const scan = (r.data as { scan: { id: string; summary: string; urgency: string } }).scan;
    scanId = scan.id;
    console.log(`\n  scan.id: ${scanId.slice(0, 8)}...`);
    console.log(`  urgency: ${scan.urgency}`);
    console.log(`  summary: ${(scan.summary ?? "").slice(0, 100)}...`);
  });

  // 3. List scans
  await step("GET /api/scans", async () => {
    const r = await api("GET", "/api/scans");
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    const count = ((r.data as { scans: unknown[] }).scans ?? []).length;
    console.log(`\n  ${count} scan(s) returned`);
  });

  // 4. Get single scan
  await step(`GET /api/scans/${scanId}`, async () => {
    const r = await api("GET", `/api/scans/${scanId}`);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  // 5. Favorite
  await step("PATCH /api/scans/[id] — set favorite", async () => {
    const r = await api("PATCH", `/api/scans/${scanId}`, { is_favorite: true });
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    const scan = (r.data as { scan: { isFavorite: boolean } }).scan;
    if (!scan.isFavorite) throw new Error("isFavorite should be true");
  });

  // 6. Chat follow-up
  let chatMessageId = "";
  await step("POST /api/chat", async () => {
    const r = await api("POST", "/api/chat", {
      scan_id: scanId,
      message: "What should I do about the watering?",
    });
    if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    const msg = (r.data as { message: { id: string; content: string } }).message;
    chatMessageId = msg.id;
    console.log(`\n  assistant: ${msg.content.slice(0, 100)}...`);
  });
  void chatMessageId;

  // 7. Create reminder
  let reminderId = "";
  await step("POST /api/reminders", async () => {
    const r = await api("POST", "/api/reminders", {
      scan_id: scanId,
      title: "Water the plant",
      due_at: new Date(Date.now() + 86400000).toISOString(),
      recurrence: "weekly",
    });
    if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}`);
    const reminder = (r.data as { reminder: { id: string } }).reminder;
    reminderId = reminder.id;
  });

  // 8. List reminders
  await step("GET /api/reminders", async () => {
    const r = await api("GET", "/api/reminders");
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    const count = ((r.data as { reminders: unknown[] }).reminders ?? []).length;
    console.log(`\n  ${count} reminder(s) returned`);
  });

  // 9. Delete reminder
  await step("DELETE /api/reminders/[id]", async () => {
    const r = await api("DELETE", `/api/reminders/${reminderId}`);
    if (r.status !== 204) throw new Error(`Expected 204, got ${r.status}`);
  });

  // 10. Delete scan (cleanup)
  await step("DELETE /api/scans/[id]", async () => {
    const r = await api("DELETE", `/api/scans/${scanId}`);
    if (r.status !== 204) throw new Error(`Expected 204, got ${r.status}`);
  });

  console.log("\n\nAll smoke tests passed.");
}

main();

import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { supabase } from "@/lib/supabase/server";
import { CreateReminderSchema } from "@/lib/schemas";
import { toResponse, AppError } from "@/lib/errors";
import type { DbReminder } from "@/lib/supabase/types";
import type { Reminder } from "@/types/domain";

function toReminder(row: DbReminder): Reminder {
  return {
    id: row.id,
    deviceId: row.device_id,
    scanId: row.scan_id,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at,
    recurrence: row.recurrence,
    doneAt: row.done_at,
    createdAt: row.created_at,
  };
}

export async function GET(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const url = new URL(req.url);
    const scanId = url.searchParams.get("scan_id");

    let q = supabase()
      .from("reminders")
      .select("*")
      .eq("device_id", deviceId)
      .order("due_at", { ascending: true });

    if (scanId) q = q.eq("scan_id", scanId);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ reminders: (data as DbReminder[]).map(toReminder) });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();

    const body = await req.json().catch(() => ({}));
    const parsed = CreateReminderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("BAD_INPUT", parsed.error.issues[0]?.message ?? "Invalid reminder data");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase().from("reminders") as any)
      .insert({
        device_id: deviceId,
        scan_id: parsed.data.scan_id ?? null,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        due_at: parsed.data.due_at,
        recurrence: parsed.data.recurrence,
      })
      .select()
      .single();

    if (error || !row) {
      throw new AppError("INTERNAL", "Failed to create reminder");
    }

    return NextResponse.json({ reminder: toReminder(row as DbReminder) }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

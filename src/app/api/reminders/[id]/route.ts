import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { supabase } from "@/lib/supabase/server";
import { PatchReminderSchema } from "@/lib/schemas";
import { toResponse, AppError } from "@/lib/errors";
import type { DbReminder } from "@/lib/supabase/types";
import type { Reminder } from "@/types/domain";

type RouteCtx = { params: Promise<{ id: string }> };

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

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const parsed = PatchReminderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("BAD_INPUT", parsed.error.issues[0]?.message ?? "Invalid patch data");
    }

    const d = parsed.data;
    const update: import("@/lib/supabase/types").Database["public"]["Tables"]["reminders"]["Update"] = {};
    if (d.title !== undefined) update.title = d.title;
    if (d.notes !== undefined) update.notes = d.notes;
    if (d.due_at !== undefined) update.due_at = d.due_at;
    if (d.recurrence !== undefined) update.recurrence = d.recurrence;
    if (d.done_at !== undefined) update.done_at = d.done_at ?? null;

    if (Object.keys(update).length === 0) {
      throw new AppError("BAD_INPUT", "No fields to update");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase().from("reminders") as any)
      .update(update)
      .eq("id", id)
      .eq("device_id", deviceId)
      .select()
      .single();

    if (error || !row) {
      throw new AppError("NOT_FOUND", "Reminder not found");
    }

    return NextResponse.json({ reminder: toReminder(row as DbReminder) });
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await ctx.params;

    const { error } = await supabase()
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("device_id", deviceId);

    if (error) throw new AppError("NOT_FOUND", "Reminder not found");

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toResponse(err);
  }
}

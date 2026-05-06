import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { supabase } from "@/lib/supabase/server";
import { getScanWithSignedUrl } from "@/lib/pipeline/diagnose";
import { PatchScanSchema } from "@/lib/schemas";
import { toResponse, AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import type { DbScan, DbChatMessage } from "@/lib/supabase/types";
import type { ChatMessage } from "@/types/domain";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await ctx.params;

    const { data: scanRow, error } = await supabase()
      .from("scans")
      .select("*")
      .eq("id", id)
      .eq("device_id", deviceId)
      .single();

    if (error || !scanRow) {
      throw new AppError("NOT_FOUND", "Scan not found");
    }

    const scan = await getScanWithSignedUrl(scanRow as DbScan);

    const { data: messages } = await supabase()
      .from("chat_messages")
      .select("*")
      .eq("scan_id", id)
      .order("created_at", { ascending: true });

    const chatMessages: ChatMessage[] = (messages as DbChatMessage[] ?? []).map((m) => ({
      id: m.id,
      scanId: m.scan_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    return NextResponse.json({ scan: { ...scan, chatMessages } });
  } catch (err) {
    return toResponse(err);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const parsed = PatchScanSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("BAD_INPUT", "Invalid patch payload");
    }

    const update: import("@/lib/supabase/types").Database["public"]["Tables"]["scans"]["Update"] = {};
    if (parsed.data.is_favorite !== undefined) {
      update.is_favorite = parsed.data.is_favorite;
    }

    if (Object.keys(update).length === 0) {
      throw new AppError("BAD_INPUT", "No fields to update");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scanRow, error } = await (supabase().from("scans") as any)
      .update(update)
      .eq("id", id)
      .eq("device_id", deviceId)
      .select()
      .single();

    if (error || !scanRow) {
      throw new AppError("NOT_FOUND", "Scan not found");
    }

    const scan = await getScanWithSignedUrl(scanRow as DbScan);
    return NextResponse.json({ scan });
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { id } = await ctx.params;

    // Fetch image path before deletion
    const { data: scanRowRaw, error: fetchErr } = await supabase()
      .from("scans")
      .select("image_path")
      .eq("id", id)
      .eq("device_id", deviceId)
      .single();

    if (fetchErr || !scanRowRaw) {
      throw new AppError("NOT_FOUND", "Scan not found");
    }
    const scanRow = scanRowRaw as { image_path: string };

    // Delete from DB (chat_messages cascade, reminders set null)
    const { error: delErr } = await supabase()
      .from("scans")
      .delete()
      .eq("id", id)
      .eq("device_id", deviceId);

    if (delErr) throw new AppError("INTERNAL", "Failed to delete scan");

    // Delete image from storage (non-fatal if it fails)
    await supabase()
      .storage
      .from(env().SUPABASE_STORAGE_BUCKET)
      .remove([scanRow.image_path])
      .catch((e: unknown) => console.error("[delete scan] storage removal failed", e));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toResponse(err);
  }
}

export const dynamic = "force-dynamic";

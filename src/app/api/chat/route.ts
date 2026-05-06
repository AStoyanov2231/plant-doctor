import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { supabase } from "@/lib/supabase/server";
import { chatFollowUp } from "@/lib/services/gemini";
import { getScanWithSignedUrl } from "@/lib/pipeline/diagnose";
import { PostChatSchema } from "@/lib/schemas";
import { toResponse, AppError } from "@/lib/errors";
import type { DbScan, DbChatMessage } from "@/lib/supabase/types";
import type { ChatMessage } from "@/types/domain";

export async function POST(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();

    const body = await req.json().catch(() => ({}));
    const parsed = PostChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("BAD_INPUT", parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { scan_id, message } = parsed.data;

    // Load scan (ownership check via device_id)
    const { data: scanRow, error: scanErr } = await supabase()
      .from("scans")
      .select("*")
      .eq("id", scan_id)
      .eq("device_id", deviceId)
      .single();

    if (scanErr || !scanRow) {
      throw new AppError("NOT_FOUND", "Scan not found");
    }

    const scan = await getScanWithSignedUrl(scanRow as DbScan);

    // Load conversation history
    const { data: historyRows } = await supabase()
      .from("chat_messages")
      .select("*")
      .eq("scan_id", scan_id)
      .order("created_at", { ascending: true });

    const history: ChatMessage[] = (historyRows as DbChatMessage[] ?? []).map((m) => ({
      id: m.id,
      scanId: m.scan_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    // Get assistant response
    const assistantContent = await chatFollowUp({ scan, history, message });

    // Persist both turns
    const rows = [
      { scan_id, role: "user" as const, content: message },
      { scan_id, role: "assistant" as const, content: assistantContent },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertErr } = await (supabase().from("chat_messages") as any)
      .insert(rows)
      .select();

    if (insertErr || !inserted) {
      throw new AppError("INTERNAL", "Failed to save chat messages");
    }

    const assistantRow = inserted[1] as DbChatMessage;
    const assistantMessage: ChatMessage = {
      id: assistantRow.id,
      scanId: assistantRow.scan_id,
      role: "assistant",
      content: assistantRow.content,
      createdAt: assistantRow.created_at,
    };

    return NextResponse.json({ message: assistantMessage }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

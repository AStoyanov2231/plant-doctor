import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { supabase } from "@/lib/supabase/server";
import { getScanWithSignedUrl } from "@/lib/pipeline/diagnose";
import { ScansQuerySchema } from "@/lib/schemas";
import { toResponse } from "@/lib/errors";
import type { DbScan } from "@/lib/supabase/types";

export async function GET(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();
    const url = new URL(req.url);

    const query = ScansQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );
    if (!query.success) {
      return NextResponse.json(
        { error: { code: "BAD_INPUT", message: "Invalid query parameters" } },
        { status: 400 }
      );
    }

    const { favorite, limit, cursor } = query.data;

    let q = supabase()
      .from("scans")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (favorite) q = q.eq("is_favorite", true);
    if (cursor) q = q.lt("created_at", cursor);

    const { data, error } = await q;
    if (error) throw error;

    const scans = await Promise.all(
      (data as DbScan[]).map((row) => getScanWithSignedUrl(row))
    );

    const nextCursor = scans.length === limit ? scans[scans.length - 1].createdAt : null;

    return NextResponse.json({ scans, nextCursor });
  } catch (err) {
    return toResponse(err);
  }
}

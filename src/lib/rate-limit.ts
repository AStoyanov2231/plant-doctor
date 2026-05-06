import { supabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export async function checkRateLimit(deviceId: string): Promise<void> {
  const limit = env().SCAN_RATE_LIMIT_PER_HOUR;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dataRaw, error } = await (supabase().from("rate_limits") as any)
    .select("tokens, last_reset")
    .eq("device_id", deviceId)
    .single();
  const data = dataRaw as { tokens: number; last_reset: string } | null;

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found, which is fine for new devices
    throw new AppError("INTERNAL", "Rate limit check failed");
  }

  let tokens = data?.tokens ?? 0;
  const lastReset = data?.last_reset ?? oneHourAgo;

  // Reset token bucket if the hour window has passed
  if (lastReset < oneHourAgo) {
    tokens = 0;
  }

  if (tokens >= limit) {
    throw new AppError(
      "RATE_LIMITED",
      `Scan limit of ${limit} per hour reached. Please try again later.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase().from("rate_limits") as any)
    .upsert(
      {
        device_id: deviceId,
        tokens: tokens + 1,
        last_reset: tokens === 0 ? now.toISOString() : lastReset,
      },
      { onConflict: "device_id" }
    );
}

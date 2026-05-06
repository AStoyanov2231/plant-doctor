import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const COOKIE_NAME = "pd_device";
// ~10 years in seconds
const MAX_AGE = 60 * 60 * 24 * 365 * 10;

function sign(id: string): string {
  const hmac = createHmac("sha256", env().SESSION_SECRET);
  hmac.update(id);
  return `${id}.${hmac.digest("hex")}`;
}

function verify(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const id = signed.slice(0, dot);
  const expected = Buffer.from(sign(id));
  const actual = Buffer.from(signed);
  if (expected.length !== actual.length) return null;
  try {
    if (!timingSafeEqual(expected, actual)) return null;
  } catch {
    return null;
  }
  return id;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  let deviceId = raw ? verify(raw) : null;

  if (!deviceId) {
    // Issue a new device
    deviceId = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase().from("devices") as any).insert({ id: deviceId });
    if (error) throw new AppError("INTERNAL", "Failed to create device session");

    cookieStore.set(COOKIE_NAME, sign(deviceId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  } else {
    // Touch last_seen_at without blocking the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase().from("devices") as any)
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", deviceId)
      .then(() => {});
  }

  return deviceId;
}

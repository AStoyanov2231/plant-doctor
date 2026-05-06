import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { toResponse } from "@/lib/errors";

export async function POST() {
  try {
    const deviceId = await getOrCreateDeviceId();
    return NextResponse.json({ device_id: deviceId });
  } catch (err) {
    return toResponse(err);
  }
}

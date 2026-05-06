import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { runDiagnosisPipeline } from "@/lib/pipeline/diagnose";
import { ScanOrganSchema } from "@/lib/schemas";
import { toResponse, AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const deviceId = await getOrCreateDeviceId();
    await checkRateLimit(deviceId);

    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      throw new AppError("BAD_INPUT", "A plant image file is required");
    }

    const organsRaw = formData.get("organs");
    const organsResult = organsRaw
      ? ScanOrganSchema.safeParse(organsRaw)
      : { success: true as const, data: "auto" as const };

    if (!organsResult.success) {
      throw new AppError("BAD_INPUT", "Invalid organs value. Use: leaf, flower, fruit, bark, or auto");
    }

    const scan = await runDiagnosisPipeline({
      deviceId,
      imageFile,
      organs: organsResult.data,
    });

    return NextResponse.json({ scan }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

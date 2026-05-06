import sharp from "sharp";
import { supabase } from "@/lib/supabase/server";
import { identifyPlant } from "@/lib/services/plantnet";
import { analyzePlantHealth } from "@/lib/services/flora";
import { generateDiagnosis } from "@/lib/services/gemini";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { ScanOrgan } from "@/lib/schemas";
import type { Scan } from "@/types/domain";
import type { DbScan } from "@/lib/supabase/types";

const SIGNED_URL_TTL_SECONDS = 3600;

export async function runDiagnosisPipeline(opts: {
  deviceId: string;
  imageFile: File;
  organs?: ScanOrgan;
}): Promise<Scan> {
  const { deviceId, imageFile, organs = "auto" } = opts;
  const config = env();

  // 1. Validate and process image
  const maxBytes = config.MAX_IMAGE_MB * 1024 * 1024;
  if (imageFile.size > maxBytes) {
    throw new AppError("BAD_INPUT", `Image must be under ${config.MAX_IMAGE_MB}MB`);
  }
  const mime = imageFile.type;
  if (!["image/jpeg", "image/jpg", "image/png"].includes(mime)) {
    throw new AppError("BAD_INPUT", "Only JPG and PNG images are supported");
  }

  const rawBuffer = Buffer.from(await imageFile.arrayBuffer());

  // Strip EXIF and normalise to JPEG
  const imageBuffer = await sharp(rawBuffer)
    .rotate() // auto-orient from EXIF
    .jpeg({ quality: 85 })
    .toBuffer();

  // 2. Reserve a scan row to get the ID for the storage path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scanRow, error: insertErr } = await (supabase().from("scans") as any)
    .insert({ device_id: deviceId, image_path: "pending" })
    .select("id")
    .single();

  if (insertErr || !scanRow) {
    throw new AppError("INTERNAL", "Failed to create scan record");
  }
  const scanId = (scanRow as { id: string }).id;

  // 3. Upload image to Supabase Storage
  const ext = "jpg";
  const imagePath = `${deviceId}/${scanId}.${ext}`;
  const { error: uploadErr } = await supabase()
    .storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(imagePath, imageBuffer, { contentType: "image/jpeg", upsert: false });

  if (uploadErr) {
    // Clean up the reserved row
    await supabase().from("scans").delete().eq("id", scanId);
    throw new AppError("INTERNAL", "Failed to upload image to storage");
  }

  // 4. PlantNet identification
  const plantnet = await identifyPlant({ image: imageBuffer, organs });

  // 5. FloraAPI disease analysis (non-fatal — pipeline continues if it fails)
  let flora = null;
  try {
    flora = await analyzePlantHealth({
      image: imageBuffer,
      species: plantnet.topResults[0]?.scientificName,
    });
  } catch (err) {
    console.error("[pipeline] FloraAPI failed, continuing without disease data", err);
  }

  // 6. Gemini synthesis
  const imageBase64 = imageBuffer.toString("base64");
  const diagnosis = await generateDiagnosis({ plantnet, flora, imageBase64 });

  // 7. Persist full results
  const updatePayload: Partial<DbScan> = {
    image_path: imagePath,
    plantnet_raw: plantnet.raw as never,
    flora_raw: flora?.raw as never ?? null,
    gemini_raw: diagnosis as never,
    species_scientific: plantnet.topResults[0]?.scientificName ?? null,
    species_common: plantnet.topResults[0]?.commonNames[0] ?? null,
    species_confidence: plantnet.topResults[0]?.score ?? null,
    urgency: diagnosis.urgency,
    summary: diagnosis.summary,
    likely_issues: diagnosis.likelyIssues as never,
    recommended_actions: diagnosis.recommendedActions as never,
    follow_up_questions: diagnosis.followUpQuestions as never,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedRow, error: updateErr } = await (supabase().from("scans") as any)
    .update(updatePayload)
    .eq("id", scanId)
    .select()
    .single();

  if (updateErr || !updatedRow) {
    throw new AppError("INTERNAL", "Failed to save diagnosis results");
  }

  // 8. Generate signed URL for the image
  const { data: urlData } = await supabase()
    .storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS);

  return dbScanToScan(updatedRow as DbScan, urlData?.signedUrl ?? "");
}

export async function getScanWithSignedUrl(row: DbScan): Promise<Scan> {
  const config = env();
  const { data: urlData } = await supabase()
    .storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(row.image_path, SIGNED_URL_TTL_SECONDS);

  return dbScanToScan(row, urlData?.signedUrl ?? "");
}

export function dbScanToScan(row: DbScan, imageUrl: string): Scan {
  return {
    id: row.id,
    deviceId: row.device_id,
    imageUrl,
    speciesScientific: row.species_scientific,
    speciesCommon: row.species_common,
    speciesConfidence: row.species_confidence,
    urgency: row.urgency,
    summary: row.summary,
    likelyIssues: (row.likely_issues as never) ?? [],
    recommendedActions: (row.recommended_actions as never) ?? [],
    followUpQuestions: (row.follow_up_questions as never) ?? [],
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

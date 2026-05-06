// TODO(flora-shape): The FloraAPI request/response shape was not publicly
// accessible at planning time. Consult your FloraAPI dashboard docs at
// https://floraapi.com to fill in the request format.
//
// This file is structured so that only this service module needs to change;
// the rest of the pipeline handles a null flora result gracefully.

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export interface FloraDisease {
  name: string;
  probability: number; // 0–1
  treatment?: string;
}

export interface FloraCareAdvice {
  watering?: string;
  light?: string;
  soil?: string;
}

export interface FloraResult {
  diseases: FloraDisease[];
  careAdvice: FloraCareAdvice | null;
  raw: unknown;
}

export async function analyzePlantHealth(opts: {
  image: Buffer;
  filename?: string;
  species?: string;
}): Promise<FloraResult> {
  const { image, filename = "plant.jpg", species } = opts;
  const { FLORA_API_KEY, FLORA_API_BASE_URL } = env();

  // TODO(flora-shape): Replace the block below with the actual FloraAPI request.
  // The placeholder makes a POST to /health with multipart image + species.
  // Adjust the URL path, field names, auth header name, and response parsing
  // to match what the FloraAPI docs specify.

  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), filename);
  if (species) form.append("species", species);

  let res: Response;
  try {
    res = await fetch(`${FLORA_API_BASE_URL}/health`, {
      method: "POST",
      headers: {
        // TODO(flora-shape): confirm auth header format
        Authorization: `Bearer ${FLORA_API_KEY}`,
      },
      body: form,
    });
  } catch (err) {
    throw new AppError("UPSTREAM_FLORA", "FloraAPI request failed", err);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(
      "UPSTREAM_FLORA",
      `FloraAPI returned ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await res.json();

  // TODO(flora-shape): map the actual response fields here
  const diseases: FloraDisease[] = (data.diseases ?? data.results ?? []).map(
    (d: { name?: string; probability?: number; treatment?: string }) => ({
      name: d.name ?? "Unknown",
      probability: d.probability ?? 0,
      treatment: d.treatment,
    })
  );

  const careAdvice: FloraCareAdvice | null = data.care ?? data.care_advice ?? null;

  return { diseases, careAdvice, raw: data };
}

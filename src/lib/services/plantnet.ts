import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { ScanOrgan } from "@/lib/schemas";

export interface PlantNetSpecies {
  scientificName: string;
  commonNames: string[];
  score: number;
}

export interface PlantNetResult {
  bestMatch: string | null;
  topResults: PlantNetSpecies[];
  raw: unknown;
}

export async function identifyPlant(opts: {
  image: Buffer;
  filename?: string;
  organs?: ScanOrgan;
  lang?: string;
}): Promise<PlantNetResult> {
  const { image, filename = "plant.jpg", organs = "auto", lang = "en" } = opts;
  const apiKey = env().PLANTNET_API_KEY;

  const form = new FormData();
  form.append("images", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), filename);
  form.append("organs", organs);

  const url = new URL("https://my-api.plantnet.org/v2/identify/all");
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("lang", lang);
  url.searchParams.set("nb-results", "5");
  url.searchParams.set("no-reject", "false");

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "POST", body: form });
  } catch (err) {
    throw new AppError("UPSTREAM_PLANTNET", "PlantNet request failed", err);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(
      "UPSTREAM_PLANTNET",
      `PlantNet returned ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await res.json();

  const topResults: PlantNetSpecies[] = (data.results ?? []).map((r: {
    score: number;
    species: { scientificNameWithoutAuthor: string; commonNames?: string[] };
  }) => ({
    scientificName: r.species?.scientificNameWithoutAuthor ?? "",
    commonNames: r.species?.commonNames ?? [],
    score: r.score ?? 0,
  }));

  return {
    bestMatch: data.bestMatch ?? null,
    topResults,
    raw: data,
  };
}

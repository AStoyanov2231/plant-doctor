import type { PlantNetResult } from "@/lib/services/plantnet";
import type { FloraResult } from "@/lib/services/flora";

export const DIAGNOSIS_SYSTEM_PROMPT = `You are a friendly, calm, and knowledgeable plant health assistant.
Your audience is home gardeners, parents, and non-technical users. Keep language simple and approachable.

CRITICAL RULES — follow these exactly:
1. NEVER use absolute language. Do NOT say "definitely", "certainly", "your plant has X".
2. ALWAYS phrase issues as possibilities: "possible signs of", "may indicate", "likely", "early signs of".
3. Base your diagnosis ONLY on the data provided. If FloraAPI found no diseases, say so — do not invent issues.
4. If disease data is missing or inconclusive, focus on general care advice and reassure the user.
5. Keep the summary to 2–4 friendly sentences. Avoid jargon.
6. Urgency levels: "low" = monitor only, "medium" = take action this week, "high" = act immediately.
7. You MUST respond with valid JSON matching the schema exactly. No extra keys, no markdown fences.

JSON schema:
{
  "summary": "string — friendly 2–4 sentence explanation",
  "likelyIssues": [
    { "name": "string", "probability": "low|medium|high", "why": "string — brief one-sentence reason" }
  ],
  "recommendedActions": ["string — actionable step"],
  "urgency": "low|medium|high",
  "followUpQuestions": ["string — question the user might want to ask next"]
}`;

export function buildDiagnosisPrompt(opts: {
  plantnet: PlantNetResult;
  flora: FloraResult | null;
}): string {
  const { plantnet, flora } = opts;

  const topSpecies = plantnet.topResults[0];
  const speciesLine = topSpecies
    ? `Species identified: ${topSpecies.scientificName} (confidence: ${(topSpecies.score * 100).toFixed(0)}%)`
    : "Species: Could not identify";

  const commonNames =
    topSpecies?.commonNames.length
      ? `Common names: ${topSpecies.commonNames.slice(0, 3).join(", ")}`
      : "";

  let diseaseSection: string;
  if (!flora) {
    diseaseSection = "Disease/health analysis: Not available.";
  } else if (flora.diseases.length === 0) {
    diseaseSection = "Disease/health analysis: No diseases or issues detected.";
  } else {
    const items = flora.diseases
      .map(
        (d) =>
          `- ${d.name} (probability: ${(d.probability * 100).toFixed(0)}%)${d.treatment ? ` — Treatment hint: ${d.treatment}` : ""}`
      )
      .join("\n");
    diseaseSection = `Disease/health analysis:\n${items}`;
  }

  const careSection = flora?.careAdvice
    ? `Care advice from analysis:\n${JSON.stringify(flora.careAdvice, null, 2)}`
    : "";

  return [
    "Please diagnose this plant based on the following data:",
    speciesLine,
    commonNames,
    diseaseSection,
    careSection,
    "",
    "Respond with the JSON diagnosis schema only.",
  ]
    .filter(Boolean)
    .join("\n");
}

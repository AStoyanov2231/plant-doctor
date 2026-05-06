import { GoogleGenAI, type Content, type ContentListUnion } from "@google/genai";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { DiagnosisOutputSchema, type DiagnosisOutput } from "@/lib/schemas";
import { buildDiagnosisPrompt, DIAGNOSIS_SYSTEM_PROMPT } from "@/lib/prompts/diagnosis";
import { buildChatPrompt } from "@/lib/prompts/chat";
import type { PlantNetResult } from "@/lib/services/plantnet";
import type { FloraResult } from "@/lib/services/flora";
import type { ChatMessage, Scan } from "@/types/domain";

const FALLBACK_MODELS = ["gemini-2.5-flash-lite"];

let _ai: GoogleGenAI | undefined;
function ai() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: env().GEMINI_API_KEY });
  return _ai;
}

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message);
    return (
      msg.includes('"code":503') ||
      msg.includes("UNAVAILABLE") ||
      msg.includes('"code":429') ||
      msg.includes("RESOURCE_EXHAUSTED")
    );
  }
  return false;
}

async function generateWithFallback(
  callFn: (model: string) => Promise<string>
): Promise<string> {
  const models = [env().GEMINI_MODEL, ...FALLBACK_MODELS];
  for (let i = 0; i < models.length; i++) {
    try {
      return await callFn(models[i]);
    } catch (err) {
      if (isRetryableError(err) && i < models.length - 1) {
        console.warn(`[gemini] ${models[i]} overloaded, trying ${models[i + 1]}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All Gemini models unavailable");
}

export async function generateDiagnosis(opts: {
  plantnet: PlantNetResult;
  flora: FloraResult | null;
  imageBase64?: string;
}): Promise<DiagnosisOutput> {
  const { plantnet, flora, imageBase64 } = opts;

  const userText = buildDiagnosisPrompt({ plantnet, flora });

  const contents: ContentListUnion = imageBase64
    ? ([
        {
          role: "user",
          parts: [
            { text: userText },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ] as Content[])
    : userText;

  let raw: string;
  try {
    raw = await generateWithFallback((model) =>
      ai().models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: DIAGNOSIS_SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      }).then((r) => r.text ?? "")
    );
  } catch (err) {
    console.error("[gemini] diagnosis failed:", err);
    throw new AppError("UPSTREAM_GEMINI", "Gemini diagnosis request failed", err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("UPSTREAM_GEMINI", "Gemini returned invalid JSON for diagnosis");
  }

  const result = DiagnosisOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new AppError("UPSTREAM_GEMINI", "Gemini response did not match expected schema");
  }

  return result.data;
}

export async function chatFollowUp(opts: {
  scan: Scan;
  history: ChatMessage[];
  message: string;
}): Promise<string> {
  const { scan, history, message } = opts;

  const { systemInstruction, contents } = buildChatPrompt({ scan, history, message });

  let text: string;
  try {
    text = await generateWithFallback((m) =>
      ai().models.generateContent({
        model: m,
        contents: contents as ContentListUnion,
        config: { systemInstruction },
      }).then((r) => r.text ?? "")
    );
  } catch (err) {
    throw new AppError("UPSTREAM_GEMINI", "Gemini chat request failed", err);
  }

  if (!text.trim()) {
    throw new AppError("UPSTREAM_GEMINI", "Gemini returned an empty chat response");
  }

  return text.trim();
}

import type { Content } from "@google/genai";
import type { Scan, ChatMessage } from "@/types/domain";

export const CHAT_SYSTEM_PROMPT = `You are a friendly plant health assistant helping a user understand their plant's diagnosis.

CRITICAL RULES:
1. NEVER invent new diseases or conditions not mentioned in the original diagnosis.
2. If asked about something not in the diagnosis, say you don't have enough information and suggest consulting a local nursery.
3. NEVER use absolute language ("definitely", "certainly"). Always use qualifiers ("possibly", "likely", "may").
4. Keep answers friendly, calm, and simple — the user is a home gardener.
5. You may refer to the original diagnosis summary and issues below.
6. If the user asks a general plant care question (watering, light, etc.), answer helpfully even if not in the diagnosis.`;

export function buildChatPrompt(opts: {
  scan: Scan;
  history: ChatMessage[];
  message: string;
}): {
  systemInstruction: string;
  contents: Content[];
} {
  const { scan, history, message } = opts;

  const diagnosisContext = [
    `Original diagnosis for this plant:`,
    `Species: ${scan.speciesScientific ?? "Unknown"}${scan.speciesCommon ? ` (${scan.speciesCommon})` : ""}`,
    `Summary: ${scan.summary ?? "No summary available"}`,
    scan.likelyIssues.length > 0
      ? `Likely issues: ${scan.likelyIssues.map((i) => `${i.name} (${i.probability})`).join(", ")}`
      : "No specific issues detected",
    `Urgency: ${scan.urgency ?? "unknown"}`,
    `Recommended actions: ${scan.recommendedActions.join("; ")}`,
  ].join("\n");

  const systemInstruction = `${CHAT_SYSTEM_PROMPT}\n\n${diagnosisContext}`;

  const contents: Content[] = [];

  // Build conversation history (Gemini uses "user"/"model" roles)
  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add the new user message
  contents.push({ role: "user", parts: [{ text: message }] });

  return { systemInstruction, contents };
}

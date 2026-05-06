import type { Content } from "@google/genai";
import type { Scan, ChatMessage } from "@/types/domain";

export const CHAT_SYSTEM_PROMPT = `Ти си приятелски настроен асистент за здравето на растенията, помагащ на потребителя да разбере диагнозата на растението му.
ВАЖНО: Отговаряй САМО на български език.

КРИТИЧНИ ПРАВИЛА:
1. НИКОГА не измисляй нови болести или проблеми, неспоменати в оригиналната диагноза.
2. Ако те питат за нещо извън диагнозата, кажи, че нямаш достатъчно информация и предложи консултация с местен разсадник.
3. НИКОГА не използвай абсолютен език ("определено", "сигурно"). Винаги използвай квалификатори ("вероятно", "може би", "може").
4. Дръж отговорите приятелски, спокойни и прости — потребителят е домашен градинар.
5. Може да се позовеш на оригиналното резюме на диагнозата и проблемите по-долу.
6. Ако потребителят зададе общ въпрос за грижата на растенията (поливане, светлина и т.н.), отговори полезно дори ако не е в диагнозата.`;

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
    `Оригинална диагноза за това растение:`,
    `Вид: ${scan.speciesScientific ?? "Неизвестен"}${scan.speciesCommon ? ` (${scan.speciesCommon})` : ""}`,
    `Резюме: ${scan.summary ?? "Няма налично резюме"}`,
    scan.likelyIssues.length > 0
      ? `Вероятни проблеми: ${scan.likelyIssues.map((i) => `${i.name} (${i.probability})`).join(", ")}`
      : "Не са открити конкретни проблеми",
    `Спешност: ${scan.urgency ?? "неизвестна"}`,
    `Препоръчани действия: ${scan.recommendedActions.join("; ")}`,
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
